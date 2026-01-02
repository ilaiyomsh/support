import { useRef, useEffect } from 'react';
import { Box, Flex, Button, Text } from '@vibe/core';

interface VideoPreviewProps {
    videoBlob: Blob;
    onDiscard: () => void;
}

export default function VideoPreview({ videoBlob, onDiscard }: VideoPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoBlob && videoRef.current) {
            const url = URL.createObjectURL(videoBlob);
            videoRef.current.src = url;
            return () => URL.revokeObjectURL(url);
        }
    }, [videoBlob]);

    const handleDownload = () => {
        const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
        const filename = `recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${ext}`;
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleOpenInNewTab = () => {
        const url = URL.createObjectURL(videoBlob);
        window.open(url, '_blank');
    };

    return (
        <Box style={{ marginTop: '20px', borderTop: '2px solid #e6e9ef', paddingTop: '20px' }}>
            <Flex direction="column" gap="medium">
                <Text type="text1" weight="bold">תצוגה מקדימה</Text>
                
                <Box style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
                    <video
                        ref={videoRef}
                        controls
                        playsInline
                        style={{ width: '100%', display: 'block' }}
                    />
                </Box>

                <Flex gap="small" wrap>
                    <Button onClick={handleOpenInNewTab} kind="secondary" size="medium">
                        🎥 פתח בחלון חדש
                    </Button>
                    <Button onClick={handleDownload} kind="secondary" size="medium">
                        💾 הורד למחשב
                    </Button>
                    <Button onClick={onDiscard} kind="tertiary" color="negative" size="medium">
                        מחק הקלטה
                    </Button>
                </Flex>

                <Box style={{ padding: '12px', background: '#f0f4ff', borderRadius: '6px', border: '1px solid #d0d4e4' }}>
                    <Text type="text3" color="secondary">
                        💡 ההקלטה מוכנה לשליחה. לחץ על "שלח פנייה" למטה כדי לשלוח אותה לצוות התמיכה.
                    </Text>
                </Box>
            </Flex>
        </Box>
    );
}

