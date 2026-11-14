import { Link } from 'react-router-dom';

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>
      ESCHOOL
    </Link>
  );
}