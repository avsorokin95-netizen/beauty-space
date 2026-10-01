import { Phone, ArrowUpRight } from 'lucide-react';
import { useContacts } from '../hooks/useContacts';
export function MobileBooking() {
  const studio = useContacts();
  return <nav className="mobile-booking" aria-label="Швидкий запис"><a href={`tel:${studio.phone}`}><Phone size={17} />Зателефонувати</a><a href={studio.direct} data-analytics="booking" target="_blank" rel="noopener noreferrer">Запис у Direct <ArrowUpRight size={17} /></a></nav>;
}
