import { useState } from "react";
import StationSearch from "../StationSearch";

export default function StationSearchExample() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="max-w-md space-y-4 p-8">
      <StationSearch
        label="Van"
        value={from}
        onChange={setFrom}
        placeholder="Bijv. Amsterdam Centraal"
      />
      <StationSearch
        label="Naar"
        value={to}
        onChange={setTo}
        placeholder="Bijv. Rotterdam Centraal"
      />
    </div>
  );
}
