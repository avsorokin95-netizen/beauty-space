import { ArrowUpRight, MapPin } from "lucide-react";
import { useContacts } from "../hooks/useContacts";
import { Reveal } from "./ui";

export function StudioMap() {
  const studio = useContacts();
  const address = `${studio.address}, ${studio.city}, Україна`;
  return (
    <Reveal className="shell studio-map">
      <div className="map-heading">
        <div>
          <MapPin size={20} aria-hidden="true" />
          <h3>Твій beauty-простір — поруч</h3>
        </div>
        <a href={studio.map} target="_blank" rel="noopener noreferrer">
          Відкрити маршрут <ArrowUpRight size={16} />
        </a>
      </div>
      <iframe
        title={`Карта студії: ${address}`}
        src={studio.mapEmbed}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <p className="map-caption">
        {studio.address} · {studio.city} · {studio.floor}
      </p>
      {studio.directionsVideo && <a className="map-video" href={studio.directionsVideo} target="_blank" rel="noopener noreferrer">
        Як нас знайти — відео в Instagram <ArrowUpRight size={16} aria-hidden="true" />
      </a>}
    </Reveal>
  );
}
