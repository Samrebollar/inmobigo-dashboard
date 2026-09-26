'use client'

import { MessageThread, ThreadMessage } from '@/components/shared/MessageThread'
import { getSecurityMessageThreadAction, sendSecurityMessageAction } from '@/app/actions/security-messages-actions'

export function SecurityMessageThread({ adminName }: { adminName: string }) {
    return (
        <MessageThread
            adminName={adminName}
            selfRole="security"
            realtimeChannel="security-messages"
            realtimeTable="resident_messages"
            realtimeFilterColumn="security_user_id"
            loadThread={async () => {
                const res = await getSecurityMessageThreadAction()
                return { success: res.success, data: res.data as ThreadMessage[], contextId: res.securityUserId || null }
            }}
            sendMessage={async (body: string) => {
                const res = await sendSecurityMessageAction(body)
                return { success: res.success, data: res.data as ThreadMessage, error: res.error }
            }}
        />
    )
}
