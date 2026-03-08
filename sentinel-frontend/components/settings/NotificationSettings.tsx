"use client";

import { useState, useEffect } from 'react';

// Standard Switch:
function Toggle({ label, description, checked, onChange }: { label: string, description: string, checked?: boolean, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
            <div className="space-y-0.5">
                <h3 className="text-sm font-medium text-white">{label}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            {/* Simple CSS Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
        </div>
    );
}

export function NotificationSettings() {
    const [slackWebhook, setSlackWebhook] = useState('');
    const [discordWebhook, setDiscordWebhook] = useState('');
    const [teamsWebhook, setTeamsWebhook] = useState('');
    const [notifyOnNewIncident, setNotifyOnNewIncident] = useState(true);
    const [notifyOnHealing, setNotifyOnHealing] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [testStatus, setTestStatus] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const res = await fetch(`${apiUrl}/api/settings/notifications`);
                if (res.ok) {
                    const data = await res.json();
                    setSlackWebhook(data.slackWebhook || '');
                    setDiscordWebhook(data.discordWebhook || '');
                    setTeamsWebhook(data.teamsWebhook || '');
                    setNotifyOnNewIncident(data.notifyOnNewIncident ?? true);
                    setNotifyOnHealing(data.notifyOnHealing ?? true);
                }
            } catch (err) {
                console.error("Failed to load notifications settings", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/settings/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slackWebhook,
                    discordWebhook,
                    teamsWebhook,
                    notifyOnNewIncident,
                    notifyOnHealing
                })
            });

            if (res.ok) {
                // Settings saved UI feedback could go here
                alert("Settings saved successfully.");
            }
        } catch (err) {
            console.error("Failed to save settings", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTest = async (platform: string, webhookUrl: string) => {
        if (!webhookUrl) return;

        setTestStatus(prev => ({ ...prev, [platform]: 'Testing...' }));
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/settings/notifications/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, webhookUrl })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setTestStatus(prev => ({ ...prev, [platform]: 'Test Successful' }));
                } else {
                    setTestStatus(prev => ({ ...prev, [platform]: 'Test Failed' }));
                }
            } else {
                 setTestStatus(prev => ({ ...prev, [platform]: 'Test Failed' }));
            }
        } catch (err) {
            console.error(`Mock test to ${platform} failed`, err);
            setTestStatus(prev => ({ ...prev, [platform]: 'Test Failed' }));
        }

        setTimeout(() => {
            setTestStatus(prev => ({ ...prev, [platform]: '' }));
        }, 3000);
    };

    if (isLoading) {
        return <div className="text-muted-foreground text-sm animate-pulse">Loading settings...</div>;
    }

    return (
        <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-xl font-semibold text-white mb-1">Notifications</h2>
                <p className="text-muted-foreground text-sm">Configure ChatOps integrations and alert preferences.</p>
            </div>

            <div className="space-y-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Webhooks Configuration</div>
                
                {/* Slack Configuration */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <label className="text-sm font-medium text-white">Slack Webhook URL</label>
                    <input 
                        type="password" 
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                    <div className="flex justify-between items-center">
                         {testStatus['slack'] ? (
                             <span className="text-xs font-medium text-primary">{testStatus['slack']}</span>
                         ) : <span></span>}
                        <button 
                            type="button"
                            onClick={() => handleTest('slack', slackWebhook)}
                            disabled={!slackWebhook}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Send Test Message
                        </button>
                    </div>
                </div>

                {/* Discord Configuration */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <label className="text-sm font-medium text-white">Discord Webhook URL</label>
                    <input 
                        type="password" 
                        value={discordWebhook}
                        onChange={(e) => setDiscordWebhook(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                     <div className="flex justify-between items-center">
                         {testStatus['discord'] ? (
                             <span className="text-xs font-medium text-primary">{testStatus['discord']}</span>
                         ) : <span></span>}
                        <button 
                            type="button"
                            onClick={() => handleTest('discord', discordWebhook)}
                            disabled={!discordWebhook}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Send Test Message
                        </button>
                    </div>
                </div>

                {/* Teams Configuration */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <label className="text-sm font-medium text-white">Microsoft Teams Webhook URL</label>
                    <input 
                        type="password" 
                        value={teamsWebhook}
                        onChange={(e) => setTeamsWebhook(e.target.value)}
                        placeholder="https://YOUR_DOMAIN.webhook.office.com/webhookb2/..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                     <div className="flex justify-between items-center">
                         {testStatus['teams'] ? (
                             <span className="text-xs font-medium text-primary">{testStatus['teams']}</span>
                         ) : <span></span>}
                        <button 
                            type="button"
                            onClick={() => handleTest('teams', teamsWebhook)}
                            disabled={!teamsWebhook}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Send Test Message
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Event Preferences</div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4">
                    <Toggle 
                        label="Notify on New Incident" 
                        description="Receive alerts when a new critical failure occurs." 
                        checked={notifyOnNewIncident} 
                        onChange={(e) => setNotifyOnNewIncident(e.target.checked)} 
                    />
                    <Toggle 
                        label="Notify on Healing Completion" 
                        description="Receive alerts when an incident has been automatically healed." 
                        checked={notifyOnHealing} 
                        onChange={(e) => setNotifyOnHealing(e.target.checked)} 
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary text-black hover:bg-primary/90 font-medium px-4 py-2 rounded-lg transition"
                >
                    {isSaving ? "Saving..." : "Save Configuration"}
                </button>
            </div>
        </div>
    );
}
