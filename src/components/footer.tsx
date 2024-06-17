export function Footer() {
  return (
    <footer className="flex flex-col items-center pt-10">
      <h3 className="mb-2 text-lg font-bold">Huge thanks to these projects:</h3>
      <ul className="prose list-inside list-disc dark:prose-invert">
        <li>
          <a
            href="https://github.com/elden-ring-progression-tracker/elden-ring-progression-tracker.github.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Elden Ring Progression Tracker on GitHub
          </a>
        </li>
        <li>
          <a
            href="https://eldenring.wiki.fextralife.com/Game+Progress+Route"
            target="_blank"
            rel="noopener noreferrer"
          >
            Game Progress Route on Fextralife
          </a>
        </li>
        <li>
          <a
            href="https://github.com/ClayAmore/ER-Save-Editor"
            target="_blank"
            rel="noopener noreferrer"
          >
            ER Save Editor on GitHub
          </a>
        </li>
      </ul>
      <div className="flex w-full flex-wrap justify-center gap-2 py-8 text-2xl">
        <a
          className="hover:underline"
          href="https://github.com/EthanShoeDev/elden-ring-compass"
        >
          Github
        </a>{' '}
        -
        <a
          className="hover:underline"
          href="https://elden-ring-compass.vercel.app"
        >
          Website
        </a>
      </div>
    </footer>
  );
}
