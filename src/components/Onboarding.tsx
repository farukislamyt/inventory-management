import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  DollarSign, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Box,
  Rocket,
  ShieldCheck
} from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { completeOnboarding, updateSettings } = useApp();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: 'SuFa Inventory',
    currency: 'USD',
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleComplete = () => {
    updateSettings(formData);
    completeOnboarding();
  };

  const steps = [
    {
      title: "Welcome to SuFa",
      description: "Let's get your industry-grade inventory system ready in just a few steps.",
      icon: Rocket,
      color: "bg-blue-500"
    },
    {
      title: "Business Identity",
      description: "What's the name of your business? This will appear on your invoices.",
      icon: Building2,
      color: "bg-purple-500"
    },
    {
      title: "Localization",
      description: "Choose your preferred currency for financial tracking.",
      icon: DollarSign,
      color: "bg-emerald-500"
    },
    {
      title: "Data Security",
      description: "Your data is stored locally in your browser. We recommend regular backups.",
      icon: ShieldCheck,
      color: "bg-amber-500"
    }
  ];

  const currentStep = steps[step-1];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Box className="text-white w-6 h-6" />
            </div>
            <span className="font-bold text-2xl text-slate-900 dark:text-white">SuFa Inventory</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="h-2 bg-slate-100 dark:bg-slate-800">
            <div 
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-8 md:p-12">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${currentStep.color} text-white`}>
                  {React.createElement(currentStep.icon, { className: "w-6 h-6" })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{currentStep.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{currentStep.description}</p>
                </div>
              </div>

              <div className="py-8">
                {step === 2 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Business Name</label>
                    <input 
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white text-lg"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="grid grid-cols-2 gap-4">
                    {['USD', 'EUR', 'GBP', 'BDT', 'INR', 'JPY'].map((curr) => (
                      <button
                        key={curr}
                        onClick={() => setFormData({...formData, currency: curr})}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.currency === curr 
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                            : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <span className="font-bold block">{curr}</span>
                        <span className="text-xs opacity-60">Currency Symbol</span>
                      </button>
                    ))}
                  </div>
                )}

                {step === 4 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-4">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                      You're all set! SuFa uses a local-first approach, meaning your data never leaves your device. This ensures maximum privacy and speed.
                    </p>
                  </div>
                )}

                {step === 1 && (
                  <div className="flex justify-center py-4">
                    <div className="relative">
                      <Rocket className="w-24 h-24 text-blue-600 relative" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              {step > 1 ? (
                <button 
                  onClick={prevStep}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : <div />}

              {step < steps.length ? (
                <button 
                  onClick={nextStep}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/25"
                >
                  Get Started <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <p className="text-center mt-6 text-slate-400 text-xs">
          By continuing, you agree to store data locally on this device.
        </p>
      </div>
    </div>
  );
};
