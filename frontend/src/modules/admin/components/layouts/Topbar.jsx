// src/components/layout/Topbar.jsx
import React, { useEffect, useState } from "react";

const formatDateTimePtBR = (date) => {
  const monthsShort = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const day = date.getDate();
  const month = monthsShort[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const hoursStr = hours.toString().padStart(2, "0");

  return `${month}, ${day} de ${year} - ${hoursStr}:${minutes}${ampm}`;
};

const Topbar = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-date">{formatDateTimePtBR(now)}</div>

      <div className="topbar-search">
        <span className="search-icon" />
        <input
          type="text"
          placeholder="Pesquisa"
          className="search-input"
        />
      </div>
    </header>
  );
};

export default Topbar;
