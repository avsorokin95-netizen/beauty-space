import { useContacts } from '../hooks/useContacts';
import { Eyebrow } from './ui';
export function About() {
  const studio = useContacts();
  return <section id="about" className="section shell studio-about">
    <div><Eyebrow>ПРО СТУДІЮ</Eyebrow><h2>Beauty Space<br /><em>Victoriya</em></h2></div>
    <div>{studio.introduction && <p>{studio.introduction}</p>}<p>{studio.city}, {studio.address}. {studio.floor}.</p><a className="text-link" href="#contacts">Адреса, маршрут і контакти ↗</a></div>
  </section>;
}
