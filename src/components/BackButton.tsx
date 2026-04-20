import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  to?: string;
}

export function BackButton({ label = 'Back', to }: BackButtonProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 group"
    >
      <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
      {label}
    </button>
  );
}
