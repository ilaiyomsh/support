import React, { useState, useEffect } from 'react';
import { Video, Send, LogOut, Info, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * MOCK DATA SERVICE
 * מדמה קריאה לשרת כדי לקבל את הגדרות האדמין (כותרת ותיאור)
 */
const fetchAdminConfig = () => {
    return new Promise < { title: string, description: string } > ((resolve) => {
        setTimeout(() => {
            resolve({
                title: "פתיחת פנייה לצוות תמיכה",
                description: "נתקלתם בבעיה? נשמח לעזור! אנא תארו את התקלה בפירוט וצרפו הקלטת מסך (מומלץ מאוד) כדי שנוכל לפתור את הבעיה במהירות היעילה ביותר."
            });
        }, 600);
    });
};

/**
 * RECORDING PANEL (Mock)
 * גרסה ויזואלית של הרכיב שלך לצורך התצוגה
 */
const RecordingPanelMock = ({ onRecordingComplete }: { onRecordingComplete: (url: string) => void }) => {
    const [status, setStatus] = useState < 'IDLE' | 'RECORDING' | 'DONE' > ('IDLE');

    const handleStart = () => {
        setStatus('RECORDING');
        setTimeout(() => {
            setStatus('DONE');
            onRecordingComplete('https://example.com/video.mp4');
        }, 2500); // סימולציה של הקלטה ועיבוד
    };

    const handleReset = () => {
        setStatus('IDLE');
        onRecordingComplete('');
    };

    if (status === 'DONE') {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle2 size={20} className="text-green-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-800">ההקלטה נשמרה בהצלחה!</p>
                        <p className="text-sm text-gray-500">Video_recording_001.mp4</p>
                    </div>
                </div>
                <button
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-red-500 underline decoration-dotted underline-offset-4"
                >
                    מחק והקלט מחדש
                </button>
            </div>
        );
    }

    if (status === 'RECORDING') {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center justify-center gap-3 animate-pulse">
                <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                <span className="font-medium text-red-600">מקליט מסך...</span>
                <span className="text-xs text-red-400">החלון המוקפץ פעיל כעת</span>
            </div>
        );
    }

    // IDLE STATE
    return (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center gap-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group" onClick={handleStart}>
            <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200">
                <Video size={24} className="text-indigo-600" />
            </div>
            <div className="text-center">
                <p className="font-medium text-gray-700">הוסף הקלטת מסך</p>
                <p className="text-sm text-gray-400 mt-1">לחץ כאן כדי להתחיל הקלטה (מומלץ)</p>
            </div>
        </div>
    );
};

/**
 * MAIN PAGE COMPONENT
 */
export default function TicketSubmissionPage() {
    const [config, setConfig] = useState < { title: string; description: string } | null > (null);
    const [description, setDescription] = useState('');
    const [videoUrl, setVideoUrl] = useState < string > ('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // טעינת הנתונים מהשרת בעלייה
    useEffect(() => {
        fetchAdminConfig().then(data => setConfig(data));
    }, []);

    const handleSubmit = () => {
        if (!description && !videoUrl) return;

        setIsSubmitting(true);
        // סימולציה של שליחה
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitted(true);
        }, 1500);
    };

    // תצוגת אישור לאחר שליחה
    if (submitted) {
        return (
            <div className="min-h-screen bg-[#f5f6f8] flex items-center justify-center p-4" dir="rtl">
                <div className="bg-white max-w-md w-full rounded-2xl shadow-sm p-12 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">הפנייה נשלחה!</h2>
                    <p className="text-gray-500 mb-8">תודה שדיווחת לנו. צוות התמיכה יבדוק את הנושא בהקדם.</p>
                    <button
                        onClick={() => { setSubmitted(false); setDescription(''); setVideoUrl(''); }}
                        className="text-indigo-600 font-medium hover:bg-indigo-50 px-6 py-2 rounded-full transition-colors"
                    >
                        פתח פנייה נוספת
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f6f8] flex justify-center p-4 md:p-8 font-sans text-right" dir="rtl">

            {/* CARD CONTAINER */}
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col">

                {/* ============================================================================
           HEADER SECTION (DYNAMIC FROM ADMIN)
           זה האזור החדש שביקשת - רקע מובדל, תוכן מהשרת
           ============================================================================ */}
                <div className="bg-[#eff4ff] p-8 border-b border-[#e6ecf8] relative overflow-hidden">
                    {/* Decorative element background */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-blue-400 opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                        {/* Title from Server (with Skeleton loading state) */}
                        <div className="flex-1 ml-4">
                            {config ? (
                                <h1 className="text-2xl md:text-3xl font-bold text-[#323338] mb-2 tracking-tight">
                                    {config.title}
                                </h1>
                            ) : (
                                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-2"></div>
                            )}
                        </div>

                        {/* Logout Button (Moved to side for cleaner look) */}
                        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/50">
                            <LogOut size={16} />
                            <span className="hidden sm:inline">התנתק</span>
                        </button>
                    </div>

                    {/* Description from Server */}
                    <div className="relative z-10">
                        {config ? (
                            <p className="text-[#676879] text-base leading-relaxed max-w-lg">
                                {config.description}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
                                <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ============================================================================
           FORM BODY
           ============================================================================ */}
                <div className="p-8 flex flex-col gap-8">

                    {/* Text Input Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-[#323338] flex items-center gap-1">
                            תיאור התקלה
                            <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full min-h-[120px] p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 resize-y"
                            placeholder="מה קרה? באיזה שלב הופיעה השגיאה? תאר את הצעדים לשחזור..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        {description.length === 0 && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Info size={12} />
                                אנא פרט ככל הניתן
                            </p>
                        )}
                    </div>

                    <hr className="border-gray-100" />

                    {/* Recording Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <label className="text-sm font-bold text-[#323338]">הקלטת מסך</label>
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">מומלץ מאוד</span>
                        </div>

                        {/* Using the component Mock */}
                        <RecordingPanelMock onRecordingComplete={setVideoUrl} />
                    </div>

                    {/* Submit Action */}
                    <div className="pt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={(!description && !videoUrl) || isSubmitting}
                            className={`
                w-full py-4 rounded-xl flex items-center justify-center gap-2 font-medium text-lg transition-all duration-200
                ${(!description && !videoUrl)
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#5034ff] hover:bg-[#432bdb] text-white shadow-lg shadow-indigo-200 active:scale-[0.99]'}
              `}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    שולח...
                                </>
                            ) : (
                                <>
                                    שלח פנייה
                                    <Send size={18} className={submitted ? "" : "rtl:-scale-x-100"} />
                                </>
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            המידע יישלח באופן מאובטח לשרתי החברה
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}