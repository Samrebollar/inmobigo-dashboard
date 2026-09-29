import { redirect } from 'next/navigation'

// El guardia no gestiona los reportes de mantenimiento (eso es de la
// administración): reporta fallas desde "Incidente" en su Dashboard y atiende
// lo que le asignen en Mis Tareas.
export default function MaintenancePage() {
    redirect('/seguridad/tareas')
}
