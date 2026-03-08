import React from 'react';
import { K8sEvent } from '@/hooks/useKubernetes';

interface EventStreamProps {
    events: K8sEvent[];
    namespace: string;
}

export const EventStream: React.FC<EventStreamProps> = ({ events, namespace }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Event Stream ({namespace})</h2>
            <div className="space-y-3">
                {events.map((event, idx) => (
                    <div key={idx} className="border-l-2 border-slate-600 pl-3 py-1 text-sm">
                        <div className="flex justify-between text-gray-400 text-xs mb-1">
                            <span>{new Date(event.lastSeen).toLocaleTimeString()}</span>
                            <span className={event.type === 'Warning' ? 'text-red-400' : 'text-blue-400'}>
                                {event.reason}
                            </span>
                        </div>
                        <p className="font-medium text-slate-200">{event.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                            {event.object.kind}/{event.object.name}
                        </p>
                    </div>
                ))}
                
                {events.length === 0 && (
                     <div className="text-gray-500 text-center py-10">
                        No events detected recently.
                    </div>
                )}
            </div>
        </div>
    );
};
