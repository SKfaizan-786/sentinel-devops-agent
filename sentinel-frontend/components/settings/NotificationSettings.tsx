"use client";


// Actually, let's just create a quick toggle styling inline or simpler checkbox if Switch isn't available. 
// Standard Switch:
function Toggle({ label, description, checked }: { label: string, description: string, checked?: boolean }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
            <div className="space-y-0.5">
                <h3 className="text-sm font-medium text-white">{label}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            {/* Simple CSS Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={checked} className="sr-only peer" />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
        </div>
    );
}

export function NotificationSettings() {
    return (
        <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-xl font-semibold text-white mb-1">Notifications</h2>
                <p className="text-muted-foreground text-sm">Control how and when you receive alerts.</p>
            </div>

            <div className="space-y-2">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Email Alerts</div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4">
                    <Toggle label="Critical Incidents" description="Receive emails when a critical incident is detected." checked={true} />
                    <Toggle label="Weekly Reports" description="Get a weekly summary of system performance." checked={true} />
                    <Toggle label="Marketing Updates" description="News about product features and updates." checked={false} />
                </div>
            </div>

            <div className="space-y-2">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Push Notifications</div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4">
                    <Toggle label="Browser Push" description="Receive real-time alerts in your browser." checked={true} />
                    <Toggle label="Mobile App" description="Send alerts to the Sentinel mobile app." checked={false} />
                </div>
            </div>
        </div>
    );
}
