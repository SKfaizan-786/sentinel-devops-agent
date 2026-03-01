import { useState, useEffect } from 'react';
import { RunbookTrigger, RunbookAction } from '@/lib/runbook-types';

interface RuleEditorProps {
    item: RunbookTrigger | RunbookAction;
    onSave: (updated: RunbookTrigger | RunbookAction) => void;
    onCancel: () => void;
}

export function RuleEditor({ item, onSave, onCancel }: RuleEditorProps) {
    const [formData, setFormData] = useState<RunbookTrigger | RunbookAction>({ ...item } as RunbookTrigger | RunbookAction);

    useEffect(() => {
        setFormData({ ...item } as RunbookTrigger | RunbookAction);
    }, [item]);

    const handleChange = (key: string, value: any) => {
        if ('type' in item && 'parameters' in (formData as RunbookAction)) {
            setFormData((prev) => ({
                ...prev,
                parameters: { ...prev.parameters, [key]: value }
            }));
        } else {
            setFormData((prev) => ({ ...prev, [key]: value }));
        }
    };

    const isAction = 'parameters' in item;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900/95 border-l border-slate-700 p-6 z-50 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right duration-300">
            <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                {isAction ? '🛠️ Edit Action' : '🔍 Edit Condition'}
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Type</label>
                    <div className="p-2 bg-slate-800 rounded text-slate-200 text-sm border border-slate-700">
                        {formData.type}
                    </div>
                </div>

                {!isAction ? (
                    <>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Threshold</label>
                            <input
                                type="number"
                                value={formData.threshold || ''}
                                onChange={(e) => handleChange('threshold', parseInt(e.target.value))}
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Window (seconds)</label>
                            <input
                                type="number"
                                value={formData.window || ''}
                                onChange={(e) => handleChange('window', parseInt(e.target.value))}
                                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                            />
                        </div>
                    </>
                ) : (
                    <div className="space-y-3">
                        {Object.keys(formData.parameters || {}).map(key => (
                            <div key={key}>
                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">{key}</label>
                                <input
                                    type="text"
                                    value={formData.parameters[key] || ''}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none"
                                />
                            </div>
                        ))}
                        {Object.keys(formData.parameters || {}).length === 0 && (
                            <p className="text-xs text-slate-500 italic">No adjustable parameters for this action.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-3 mt-8">
                <button
                    onClick={() => onSave(formData)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
                >
                    Save
                </button>
                <button
                    onClick={onCancel}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded transition-colors text-sm border border-slate-700"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
