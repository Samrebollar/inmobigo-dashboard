import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// This script audits the codebase for potential multi-tenant data leaks
// It looks for queries to key tables WITHOUT organization_id or condominium_id filters

const srcDir = 'src';
const SENSITIVE_TABLES = ['condominiums', 'units', 'residents', 'invoices', 'tickets', 'condo_expenses', 'resident_invoices'];
const SAFE_PATTERNS = [
  'organization_id',
  'condominium_id',
  'owner_id',
  '.eq(',
  '.in(',
  '.single()',
  'user_id',
];

// Only look at client-side components (not server pages where admin client is used with user-scoped org)
const CLIENT_DIRS = [
  'src/components',
  'src/services',
];

function readFilesRecursively(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...readFilesRecursively(fullPath));
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  // Only analyze files that import the client supabase (not admin client which has RLS bypass)
  const isClientFile = content.includes("from '@/utils/supabase/client'") || 
                       content.includes('createClient()');
  
  if (!isClientFile) return issues;

  // Look for .from('TABLE') patterns on sensitive tables
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const table of SENSITIVE_TABLES) {
      if (line.includes(`.from('${table}')`)) {
        // Look at the next 5 lines for filtering
        const context = lines.slice(i, i + 8).join('\n');
        
        // Check if there's organization_id or condominium_id in nearby context
        const hasOrgFilter = SAFE_PATTERNS.some(p => context.includes(p));
        
        // Also look backward for a filter chain that might start before
        const prevContext = lines.slice(Math.max(0, i - 2), i + 8).join('\n');
        const hasPrevFilter = SAFE_PATTERNS.some(p => prevContext.includes(p));
        
        if (!hasPrevFilter) {
          issues.push({
            file: filePath,
            line: i + 1,
            table,
            code: context.substring(0, 200).replace(/\n/g, ' | ')
          });
        }
      }
    }
  }
  
  return issues;
}

// Also look for RPC calls without organization params
function findUnfilteredRPCs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('.rpc(')) {
      const context = lines.slice(i, i + 5).join('\n');
      // RPCs with no params at all are suspicious
      if (context.includes('.rpc(') && !context.includes('organization_id') && !context.includes('p_org') && !context.includes('p_condo')) {
        issues.push({
          file: filePath,
          line: i + 1,
          table: 'RPC',
          code: context.substring(0, 200).replace(/\n/g, ' | ')
        });
      }
    }
  }
  
  return issues;
}

console.log('=== MULTI-TENANT DATA ISOLATION AUDIT ===\n');
console.log('Scanning for queries without organization_id filters...\n');

let allIssues = [];

for (const dir of CLIENT_DIRS) {
  const files = readFilesRecursively(dir);
  for (const file of files) {
    const tableIssues = analyzeFile(file);
    const rpcIssues = findUnfilteredRPCs(file);
    allIssues.push(...tableIssues, ...rpcIssues);
  }
}

if (allIssues.length === 0) {
  console.log('✅ No obvious data isolation issues found in client components.');
} else {
  console.log(`⚠️  Found ${allIssues.length} potential issues:\n`);
  for (const issue of allIssues) {
    console.log(`📍 ${issue.file}:${issue.line}`);
    console.log(`   Table: ${issue.table}`);
    console.log(`   Code: ${issue.code}`);
    console.log('');
  }
}

// Additionally, check for RPC functions used without org params in service files
console.log('\n=== RPC CALLS IN SERVICES ===');
const serviceFiles = readFilesRecursively('src/services');
for (const file of serviceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('.rpc(')) {
      const rpcLine = lines.slice(i, i+3).join(' ');
      console.log(`${file}:${i+1} → ${rpcLine.trim().substring(0, 150)}`);
    }
  }
}
