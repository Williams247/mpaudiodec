import { usePlayer } from '@/context/PlayerContext';
import { X } from 'lucide-react';

interface LoopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LoopMode = 'none' | '1x' | '2x' | '3x' | '4x' | '5x' | '6x' | 'forever';

const loopOptions: { value: LoopMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: '1x', label: '1x' },
  { value: '2x', label: '2x' },
  { value: '3x', label: '3x' },
  { value: '4x', label: '4x' },
  { value: '5x', label: '5x' },
  { value: '6x', label: '6x' },
  { value: 'forever', label: 'Forever' },
];

export default function LoopModal({ isOpen, onClose }: LoopModalProps) {
  const { loopMode, setLoopMode } = usePlayer();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end z-50">
      <div className="w-full bg-zinc-900 rounded-t-3xl border-t border-zinc-700 p-6 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Repeat Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {loopOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setLoopMode(option.value);
                onClose();
              }}
              className={`p-2 rounded-xl font-medium transition text-md ${
                loopMode === option.value
                  ? 'bg-green-500 text-black'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
