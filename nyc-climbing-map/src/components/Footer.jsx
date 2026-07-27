export default function Footer() {
  return (
    <footer className="shrink-0 bg-black text-gray-500 text-[11px] px-8 py-3 flex flex-wrap gap-x-6 gap-y-1 justify-between items-center border-t border-gray-800">
      <p>
        Sources:{" "}
        <a
          href="https://data.ny.gov/Transportation/MTA-Colors/3uhz-sej2/about_data"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white transition-colors"
        >
          MTA Colors
        </a>
        {" · "}
        <a
          href="https://data.cityofnewyork.us/City-Government/Borough-Boundaries/gthc-hcne"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white transition-colors"
        >
          Borough Boundaries
        </a>
        {/* {" · "} */}
        {/* <a
          href="https://data.cityofnewyork.us/Recreation/Parks-Properties/enfh-gkve"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white transition-colors"
        >
          Parks Properties
        </a> */}
        {/* {", NYC Open Data"} */}
      </p>
      <p>
        <a href="https://github.com/dmalary/nyc-climbing-map" target="_blank" rel="noreferrer" className="underline hover:text-white transition-colors">GitHub</a>
        {" · "}
        David Malary, 2026
      </p>
    </footer>
  );
}