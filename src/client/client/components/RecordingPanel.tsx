import { useState, useEffect, useRef } from 'react';
import { Video, CheckCircle2 } from 'lucide-react';
import { dbService } from '../services/db';
import { TicketMetadata } from '@shared/types';

interface RecordingPanelProps {
    onRecordingComplete?: (videoUrl: string) => void;
    ticketData?: {
        description: string;
        metadata: TicketMetadata;
        linkCode: string;
    };
}

type RecordingStatus = 'IDLE' | 'WAITING' | 'RECORDING' | 'PROCESSING' | 'READY' | 'TRANSFERRED';

export default function RecordingPanel({ ticketData }: RecordingPanelProps) {
    const [status, setStatus] = useState<RecordingStatus>('IDLE');

    const sessionIdRef = useRef<string | null>(null);
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const recordingTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const agentWindowRef = useRef<Window | null>(null);

    useEffect(() => {
        console.log('[RecordingPanel] useEffect initialized');

        // 1. CLEANUP: Run generic garbage collection on load (2 hours TTL)
        dbService.cleanupOldRecords();

        return () => {
            // Cleanup on unmount
            if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
            if (recordingTransitionTimeoutRef.current) clearTimeout(recordingTransitionTimeoutRef.current);
        };
    }, []);


    const startRecording = async () => {
        try {
            // Cleanup any previous session state
            if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
            if (recordingTransitionTimeoutRef.current) clearTimeout(recordingTransitionTimeoutRef.current);

            // Create session on server with metadata
            console.log('[RecordingPanel] Creating session with ticket data...');
            const sessionResponse = await fetch('/api/sessions', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: ticketData?.description || '',
                    metadata: ticketData?.metadata || {},
                    linkCode: ticketData?.linkCode || ''
                })
            });

            if (!sessionResponse.ok) throw new Error('Failed to create session');

            const sessionData = await sessionResponse.json();
            if (!sessionData.success || !sessionData.sessionId) throw new Error('Invalid session response');

            const sessionId = sessionData.sessionId;
            sessionIdRef.current = sessionId;
            console.log('[RecordingPanel] Session created:', sessionId, 'with ticket data');

            // Open agent window with sessionId
            const width = 600;
            const height = 500;
            const left = window.screen.width - width - 20;
            const top = 50;

            const agentUrl = `/client/agent.html?sessionId=${encodeURIComponent(sessionId)}`;
            agentWindowRef.current = window.open(
                agentUrl,
                'ScreenCapAgent',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no`
            );

            if (!agentWindowRef.current) {
                alert("חוסם חלונות קופצים זוהה. אנא אשר פתיחת חלונות קופצים.");
                return;
            }

            // Display "transferred" status
            setStatus('TRANSFERRED');

            // Reset to IDLE after 3 seconds
            recordingTransitionTimeoutRef.current = setTimeout(() => {
                setStatus('IDLE');
                recordingTransitionTimeoutRef.current = null;
            }, 3000);

        } catch (error) {
            console.error('[RecordingPanel] Error starting recording:', error);
            alert('שגיאה בהתחלת ההקלטה');
            setStatus('IDLE');
        }
    };

    const handleDiscard = async () => {
        // Update server that recording was discarded
        if (sessionIdRef.current) {
            try {
                await fetch(`/api/sessions/${sessionIdRef.current}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cancelled' })
                });
            } catch (e) {
                console.warn('[RecordingPanel] Could not update server on discard:', e);
            }
        }
        // ניקוי IndexedDB אחרי ביטול
        await dbService.cleanupOldRecords();
        resetFlow();
    };

    const resetFlow = () => {
        setStatus('IDLE');
    };

    if (status === 'READY') {
        return (
            <div className="recording-ready">
                <div className="recording-ready-content">
                    <div className="recording-ready-icon">
                        <CheckCircle2 size={20} style={{ color: 'var(--color-green-600)' }} />
                    </div>
                    <div className="recording-ready-text">
                        <p className="recording-ready-title">ההקלטה נשמרה בהצלחה!</p>
                        <p className="recording-ready-filename">Video_recording_{sessionIdRef.current?.slice(0, 4)}.mp4</p>
                    </div>
                </div>
                <button
                    onClick={handleDiscard}
                    className="recording-ready-action"
                >
                    מחק והקלט מחדש
                </button>
            </div>
        );
    }

    if (status === 'TRANSFERRED') {
        return (
            <div className="recording-active" style={{ backgroundColor: 'rgba(76, 175, 80, 0.05)', borderColor: 'rgba(76, 175, 80, 0.2)' }}>
                <div className="loading-spinner" style={{ width: '24px', height: '24px', border: '2px solid var(--color-gray-100)', borderTop: '2px solid var(--color-green-600)', borderRadius: '50%' }} />
                <span className="recording-status-text" style={{ color: 'var(--color-green-600)' }}>ההקלטה עברה לחלון אחר</span>
                <span className="recording-hint">אתה יכול לסגור הודעה זו או לחכות להחלפה אוטומטית</span>
            </div>
        );
    }

    if (status === 'RECORDING' || status === 'WAITING') {
        return (
            <div className={`recording-active ${status === 'RECORDING' ? 'recording-active-pulse' : ''}`}>
                <div className={`recording-indicator ${status === 'RECORDING' ? '' : ''}`} style={{ opacity: status === 'WAITING' ? 0.5 : 1 }} />
                <span className="recording-status-text">
                    {status === 'RECORDING' ? 'מקליט מסך...' : 'ממתין לאישור הרשאות...'}
                </span>
                <span className="recording-hint">החלון המוקפץ פעיל כעת</span>
            </div>
        );
    }

    if (status === 'PROCESSING') {
        return (
            <div className="recording-active" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                <div className="loading-spinner" style={{ width: '24px', height: '24px', border: '2px solid var(--color-gray-100)', borderTop: '2px solid var(--color-primary)', borderRadius: '50%' }} />
                <span className="recording-status-text" style={{ color: 'var(--color-primary)' }}>מעבד את ההקלטה...</span>
            </div>
        );
    }

    // IDLE STATE
    return (
        <div
            className="recording-panel"
            onClick={startRecording}
        >
            <div className="recording-panel-icon">
                <Video size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="recording-panel-text">
                <p className="recording-panel-title">הוסף הקלטת מסך</p>
                <p className="recording-panel-subtitle">לחץ כאן כדי להתחיל הקלטה (מומלץ)</p>
            </div>
        </div>
    );
}
