import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { randomAvatar, AVATARS } from "../utils/avatars";
import { useGame } from "../contexts/GameContext";
import SceneryCanvas from "../components/ui/SceneryCanvas";
import Panel from "../components/ui/Panel";
import SketchButton from "../components/ui/SketchButton";

const BACKEND_URL =
  ((import.meta as any).env?.VITE_BACKEND_URL as string) ||
  "http://localhost:3001";


export default function HomePage() {
  const navigate = useNavigate();
  const { fullReset } = useGame();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(randomAvatar);
  const [showAvatars, setShowAvatars] = useState(false);
  const [publicRoomCount, setPublicRoomCount] = useState<number | null>(null);

  useEffect(() => {
    fullReset();
    fetch(`${BACKEND_URL}/api/rooms`)
      .then((r) => r.json())
      .then((d) => setPublicRoomCount(d.rooms?.length ?? 0))
      .catch(() => {});
  }, []);

  const canPlay = nickname.trim().length >= 2;
  const enc = (s: string) => encodeURIComponent(s);
  const go = (path: string) =>
    navigate(`${path}?nick=${enc(nickname)}&av=${enc(avatar)}`);

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center p-4 overflow-hidden">
      <SceneryCanvas />

      {/* ── Hero ── */}
      <header className="relative text-center mb-5 sm:mb-9 px-2">
        {/* Scribbled ring — sized to the wordmark only, so it can't collide
            with the tagline underneath. */}
        <div className="relative inline-block">
          <svg
            aria-hidden
            viewBox="0 0 420 150"
            preserveAspectRatio="none"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       w-[128%] h-[150%] pointer-events-none overflow-visible"
          >
            <path
              d="M46,78 C40,34 140,16 214,18 C292,20 384,40 378,80 C372,120 268,140 192,136 C116,132 52,120 46,78"
              fill="none"
              stroke="var(--accent-warm)"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.4"
              className="ink-draw"
              style={{ ["--len" as any]: 1050, animationDelay: "0.35s" }}
            />
          </svg>
          <h1 className="relative font-game text-[2.5rem] leading-none sm:text-7xl text-game-accent
                         drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] anim-wiggle">
            Skribbl
          </h1>
        </div>

        <p className="font-game text-base sm:text-2xl text-yellow-400 mt-3 sm:mt-4 anim-pop">
          <span className="marker-underline">Draw. Guess. Win!</span>{" "}
          <span className="inline-block anim-jitter">✏️</span>
        </p>
        <p
          className="text-[#a8b0c8] mt-2 sm:mt-3 max-w-[17rem] sm:max-w-sm mx-auto text-xs sm:text-sm anim-pop"
          style={{ animationDelay: "0.22s" }}
        >
          Multiplayer drawing and guessing game. Play with friends or join a
          public room!
        </p>
      </header>

      {/* ── Setup ── */}
      <Panel
        taped
        className="w-full max-w-[21rem] sm:max-w-sm p-4 pt-6 sm:p-7 sm:pt-8"
        style={{ animationDelay: "0.3s" }}
      >
        {/* Avatar */}
        <div className="flex flex-col items-center mb-4 sm:mb-5">
          <button
            onClick={() => setShowAvatars((s) => !s)}
            aria-label="Choose your avatar"
            className={`w-[58px] h-[58px] sm:w-[76px] sm:h-[76px] rounded-full well text-[2rem] sm:text-5xl grid place-items-center
                        transition-transform hover:scale-110 active:scale-95
                        ${showAvatars ? "ring-2 ring-game-accent" : "anim-floaty"}`}
          >
            {avatar}
          </button>
          <span className="text-[#6b7492] text-[11px] mt-2 tracking-wide">
            {showAvatars ? "pick one!" : "tap to change"}
          </span>
        </div>

        {showAvatars && (
          <div className="grid grid-cols-8 gap-0.5 sm:gap-1 mb-3 sm:mb-4 p-2 sm:p-2.5 well edge-md anim-pop">
            {AVATARS.map((a, i) => (
              <button
                key={a}
                onClick={() => {
                  setAvatar(a);
                  setShowAvatars(false);
                }}
                style={{ animationDelay: `${Math.min(i * 10, 260)}ms` }}
                className={`text-xl sm:text-2xl p-0.5 sm:p-1 rounded-lg anim-pop transition-transform
                            hover:scale-125 active:scale-90
                            ${avatar === a ? "bg-[#26315a] scale-110" : "hover:bg-[#26315a]"}`}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        {/* Nickname */}
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          placeholder="Your nickname…"
          maxLength={20}
          aria-label="Your nickname"
          className="w-full well edge-md px-3 py-2.5 sm:py-3 mb-3 sm:mb-4 text-white font-semibold text-center text-base sm:text-lg
                     placeholder-[#6b7492] focus:outline-none focus:border-game-accent
                     transition-transform focus:scale-[1.02]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && canPlay) go("/create");
          }}
        />

        {/* Actions */}
        <div className="flex flex-col gap-2.5 sm:gap-3 stagger">
          <SketchButton
            variant="primary"
            size="lg"
            tilt={-0.7}
            disabled={!canPlay}
            onClick={() => go("/create")}
            className="anim-pop w-full"
          >
            🏠 Create Room
          </SketchButton>

          <SketchButton
            variant="secondary"
            size="lg"
            tilt={0.6}
            disabled={!canPlay}
            onClick={() => go("/rooms")}
            className="anim-pop w-full relative"
          >
            🌐 Browse Rooms
            {publicRoomCount !== null && publicRoomCount > 0 && (
              <span
                className="absolute -top-2.5 -right-2.5 bg-[#4ade80] text-[#10131f] text-xs font-extrabold
                           px-2 py-0.5 rounded-full min-w-[22px] text-center anim-breathe
                           shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
              >
                {publicRoomCount}
              </span>
            )}
          </SketchButton>

          <SketchButton
            variant="ghost"
            size="md"
            disabled={!canPlay}
            onClick={() => go("/join")}
            className="anim-pop w-full"
          >
            🔑 Join by Code
          </SketchButton>
        </div>

        {nickname.trim().length > 0 && !canPlay && (
          <p className="text-game-accent text-xs text-center mt-3 anim-pop">
            Nickname must be at least 2 characters
          </p>
        )}
      </Panel>

      <footer
        className="relative flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6 anim-pop"
        style={{ animationDelay: "0.48s" }}
      >
        <button
          onClick={() => navigate("/leaderboard")}
          className="text-[#a8b0c8] hover:text-yellow-400 text-xs sm:text-sm font-bold
                     transition-transform hover:scale-110"
        >
          🏆 Leaderboard
        </button>
        <span className="text-[#3a4260]">·</span>
        <p className="text-[#6b7492] text-[11px] sm:text-xs">Free · No account · 20 players</p>
      </footer>
    </div>
  );
}
