'use client'

import { MessageThread, ThreadMessage } from '@/components/shared/MessageThread'
import { getResidentMessageThreadAction, sendResidentMessageAction } from '@/app/actions/resident-messages-actions'

export function ResidentMessageThread({ adminName }: { adminName: string }) {
    return (
        <MessageThread
            adminName={adminName}
            selfRole="resident"
            realtimeChannel="resident-messages"
            realtimeTable="resident_messages"
            realtimeFilterColumn="resident_id"
            loadThread={async () => {
                const res = await getResidentMessageThreadAction()
                return { success: res.success, data: res.data as ThreadMessage[], contextId: res.residentId || null }
            }}
            sendMessage={async (body: string) => {
                const res = await sendResidentMessageAction(body)
                return { success: res.success, data: res.data as ThreadMessage, error: res.error }
            }}
        />
    )
}
