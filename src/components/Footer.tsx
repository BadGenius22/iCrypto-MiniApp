"use client";

import {
  DISCORD_LINK,
  TWITTER_LINK,
  WEBSITE_LINK,
  INSTAGRAM_LINK,
  TIKTOK_LINK,
  YOUTUBE_LINK,
} from "src/links";
import ArrowSvg from "src/svg/ArrowSvg";

const docLinks = [
  { href: WEBSITE_LINK, title: "Website" },
  { href: INSTAGRAM_LINK, title: "Instagram" },
  { href: TIKTOK_LINK, title: "TikTok" },
  { href: TWITTER_LINK, title: "X" },
  { href: DISCORD_LINK, title: "Discord" },
  { href: YOUTUBE_LINK, title: "Youtube" },
];

export default function Footer() {
  return (
    <section className="mt-auto mb-2 flex w-full flex-col items-center justify-between gap-2 md:mt-8 md:mb-6 md:flex-row md:items-start">
      <aside className="flex items-center pt-2 md:pt-0">
        <h3 className="mr-2 mb-2 text-center text-m md:mb-0 md:text-left">
          Base Buildathon{" "}
          <a
            href={WEBSITE_LINK}
            target="_blank"
            rel="noreferrer"
            title="iCrypto"
            className="font-semibold hover:text-indigo-600"
          >
            iCrypto MiniApp
          </a>
        </h3>
      </aside>
      <ul className="mt-4 flex max-w-full flex-col flex-wrap items-center justify-center gap-3 md:mt-0 md:flex-row md:justify-start md:gap-6">
        {docLinks.map(({ href, title }) => (
          <li className="flex" key={href}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              title={title}
              className="flex items-center gap-1"
            >
              <p>{title}</p>
              <ArrowSvg />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
