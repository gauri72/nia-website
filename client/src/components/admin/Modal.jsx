import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nia-navy-darker/50 backdrop-blur-[2px] p-4 animate-[fadeIn_.15s_ease]" onClick={onClose}>
      <div
        className={`w-full ${width} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-nia-border px-5 py-4">
          <h2 className="text-lg font-bold text-nia-navy-dark">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-nia-text-faint hover:text-nia-navy-dark hover:bg-nia-panel transition-colors">
            <X />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
