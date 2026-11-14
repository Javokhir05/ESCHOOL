import { useLocation } from 'react-router-dom';
import { Card } from '../components/ui';

export default function Placeholder() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Card><p className="text-ink-muted">Coming soon: <code>{pathname}</code></p></Card>
    </div>
  );
}