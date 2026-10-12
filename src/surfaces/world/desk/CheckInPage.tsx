import { useQuery } from "@tanstack/react-query";
import { Check, Dumbbell, X, Ticket, UserPlus, ScanLine, Search, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { desk, type CheckInResult, type FeedRow, type MemberRow, type Signup } from "../../../client/desk";
import { toUiError } from "../../../client/errors";
import { isNetworkError, queueScan, queuedCount, replayScans } from "../../../client/scanQueue";
import { looksLikeCode } from "../../../client/scan";
import { playSound } from "../../../client/sound";
import { Avatar, Button, By, Disc, Group, Icon, Row, useToast } from "../../../components/kit";
import { useI18n } from "../../../i18n";
import { ago, dayLabel, LANG_NAMES, time } from "../../../i18n/format";
import { localDate } from "../../../lib/dates";
import { useDesk, useStaticData } from "./DeskContext";
import { ScanPopup, type PopupState } from "./ScanPopup";
import { feedWords, memberSub } from "./words";

function useOnline(): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(navigator.onLine);
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return on;
}

/** D02 · Check-in. */
export function CheckInPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { shift, sheet, open, refresh } = useDesk();
  const { coaches } = useStaticData();
  const online = useOnline();
  const feed = useQuery({ queryKey: ["desk", "feed"], queryFn: () => desk.feed(), refetchInterval: 60_000 });
  const waiting = useQuery({ queryKey: ["desk", "waiting"], queryFn: desk.waiting, refetchInterval: 30_000 });
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [buffer, setBuffer] = useState("");
  const [queued, setQueued] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    setQueued(queuedCount());
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Keep the hidden scan input focused whenever nothing else needs the keyboard.
  const refocus = useCallback(() => {
    if (sheet || popup) return;
    const a = document.activeElement as HTMLElement | null;
    if (a && a !== document.body && a !== input.current && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable)) return;
    input.current?.focus({ preventScroll: true });
  }, [sheet, popup]);
  useEffect(() => {
    refocus();
    const id = setInterval(refocus, 800);
    document.addEventListener("click", refocus);
    return () => {
      clearInterval(id);
      document.removeEventListener("click", refocus);
    };
  }, [refocus]);

  // Back online: check the queued scans in order.
  useEffect(() => {
    if (!online || !queuedCount()) return;
    void replayScans((code, device) => desk.checkIn(code, device)).then((n) => {
      setQueued(queuedCount());
      if (n) refresh();
    });
  }, [online, refresh]);

  const show = useCallback((r: CheckInResult) => {
    playSound(r.allowed ? "allowed" : "declined");
    setPopup({ kind: "result", result: r });
  }, []);

  const scan = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      if (!navigator.onLine) {
        queueScan(code, shift?.deviceId ?? null);
        setQueued(queuedCount());
        playSound("declined");
        return setPopup({ kind: "offline", code });
      }
      try {
        const r = await desk.checkIn(code, shift?.deviceId ?? null);
        show(r);
        refresh();
      } catch (e) {
        if (isNetworkError(e)) {
          queueScan(code, shift?.deviceId ?? null);
          setQueued(queuedCount());
          playSound("declined");
          return setPopup({ kind: "offline", code });
        }
        const u = toUiError(e);
        toast(t(u.key, u.vars), { tone: "stop" });
      }
    },
    [shift, show, refresh, toast, t],
  );

  const manual = useCallback(
    async (m: MemberRow) => {
      if (!shift) return;
      setBuffer("");
      try {
        const r = await desk.checkInMember(m.id, shift.deviceId, shift.staffId);
        show(r);
        refresh();
      } catch (e) {
        const u = toUiError(e);
        toast(t(u.key, u.vars), { tone: "stop" });
      }
    },
    [shift, show, refresh, toast, t],
  );

  const nameQuery = buffer.trim() && !looksLikeCode(buffer) ? buffer.trim() : "";
  const matches = useQuery({ queryKey: ["desk", "members", "name", nameQuery], queryFn: () => desk.members(nameQuery, "all"), enabled: nameQuery.length >= 2 });

  const coachName = (id: string | null) => coaches.find((c) => c.id === id)?.name ?? null;
  const queue = waiting.data ?? [];
  const f = feed.data;

  return (
    <div className="s1-tab-in" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <input
        ref={input}
        aria-label={t("desk.scanAnywhere")}
        autoComplete="off"
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (looksLikeCode(buffer)) {
              const v = buffer;
              setBuffer("");
              void scan(v);
            } else if (matches.data?.[0]) void manual(matches.data[0]);
          } else if (e.key === "Escape") setBuffer("");
        }}
        style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
      />

      {!online || queued > 0 ? (
        <div role="status" className="s1-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: "var(--s1-yellow-tint)", color: "var(--s1-yellow)", font: "600 15px/20px var(--font-sans)" }}>
          <Icon icon={WifiOff} />
          <span style={{ flex: 1 }}>{!online ? t("desk.offline") : t("desk.queued", { n: queued })}</span>
          {!online && queued > 0 && <span>{t("desk.queued", { n: queued })}</span>}
        </div>
      ) : null}

      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 className="s1-largetitle">{t("desk.checkIn")}</h1>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "500 15px/20px var(--font-sans)", color: "var(--text-secondary)" }}>
            <Icon icon={ScanLine} style={{ color: "var(--s1-blue)", width: 18, height: 18 }} />
            {t("desk.scanAnywhere")}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <Button variant="secondary" onClick={() => open({ type: "daypass" })}>
            {t("desk.dayPass")}
          </Button>
          <Button onClick={() => open({ type: "pt" })} style={{ color: "var(--s1-pink)", background: "var(--s1-pink-tint)" }}>
            {t("desk.logPt")}
          </Button>
        </div>
      </header>

      {nameQuery && (
        <section aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, font: "600 17px/22px var(--font-sans)" }}>
            <Icon icon={Search} style={{ color: "var(--s1-blue)" }} />
            {t("desk.typeName")}: <span style={{ color: "var(--s1-blue)" }}>{nameQuery}</span>
          </div>
          <Group>
            {(matches.data ?? []).slice(0, 6).map((m) => (
              <Row
                key={m.id}
                leading={<Avatar name={m.name} />}
                title={m.name}
                sub={memberSub(t, lang, m.card, { archivedAt: m.archived_at, lastVisit: m.last_visit })}
                meta={
                  <Button size="sm" onClick={() => void manual(m)}>
                    {t("desk.checkInBtn")}
                  </Button>
                }
              />
            ))}
            {matches.isFetched && !matches.data?.length && <Row title={t("desk.noResults")} />}
          </Group>
        </section>
      )}

      {queue.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
              {t("desk.waiting")}
            </h2>
            <span className="s1-pill" style={{ color: "var(--s1-blue)", background: "var(--s1-blue-tint)" }}>
              {t("desk.qrCount", { n: queue.length })}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {queue.map((q) => (
              <QueueCard key={q.id} s={q} coach={coachName(q.coach_id)} onOpen={() => open(q.kind === "link" ? { type: "link", signup: q } : { type: "signup", signup: q })} />
            ))}
          </div>
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 className="s1-section" style={{ margin: "0 0 0 4px" }}>
            {t("desk.today")}
          </h2>
          <span className="s1-num" style={{ font: "500 14px/19px var(--font-sans)", color: "var(--text-tertiary)" }}>
            {t("desk.stats", { day: dayLabel(f?.day ?? localDate(), lang), n: f?.checkins ?? 0, h: f?.last_hour ?? 0 })}
          </span>
        </div>
        <Group>
          {(f?.rows ?? []).map((r, i) => (
            <FeedItem key={`${r.at}-${r.kind}-${i}`} r={r} fresh={i === 0} />
          ))}
          {f && !f.rows.length && <Row title={t("desk.feed.empty")} />}
        </Group>
      </section>

      {popup && <ScanPopup state={popup} onClose={() => setPopup(null)} onRenew={(memberId) => open({ type: "sell", memberId })} />}
    </div>
  );
}

function QueueCard({ s, coach, onOpen }: { s: Signup; coach: string | null; onOpen: () => void }) {
  const { t, lang } = useI18n();
  const name = `${s.first_name} ${s.last_name}`.trim();
  return (
    <div className="s1-card s1-slide-down" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14, boxShadow: "inset 0 0 0 1px rgba(0,180,255,0.35)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={name} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span className="s1-row__title">{name}</span>
          <span style={{ font: "500 13px/18px var(--font-sans)", color: "var(--text-secondary)" }}>
            <span lang={s.lang}>{LANG_NAMES[s.lang]}</span> · {ago(s.created_at, lang)}
          </span>
        </div>
        {s.kind === "link" ? (
          <span className="s1-pill" style={{ color: "var(--s1-blue)", background: "var(--s1-blue-tint)" }}>
            {t("desk.linkPill", { tag: s.link_tag ?? "" })}
          </span>
        ) : (
          coach && <span className="s1-pill s1-pill--pt">{coach}</span>
        )}
      </div>
      <Button block onClick={onOpen}>
        {s.kind === "link" ? t("desk.linkRequest") : t("desk.finishSignup")}
      </Button>
    </div>
  );
}

function FeedItem({ r, fresh }: { r: FeedRow; fresh: boolean }) {
  const { t, lang } = useI18n();
  const w = feedWords(t, lang, r);
  const disc =
    r.kind === "ok" || r.kind === "daypass" ? (
      <Disc tone="go">
        <Icon icon={Check} />
      </Disc>
    ) : r.kind === "no" ? (
      <Disc tone="stop">
        <Icon icon={X} />
      </Disc>
    ) : r.kind === "pt" ? (
      <Disc tone="pt">
        <Icon icon={Dumbbell} />
      </Disc>
    ) : r.kind === "new" ? (
      <Disc tone="money">
        <Icon icon={UserPlus} />
      </Disc>
    ) : (
      <Disc tone="money">
        <Icon icon={Ticket} />
      </Disc>
    );
  return (
    <Row
      className={fresh ? "s1-slide-down" : undefined}
      leading={disc}
      title={w.title}
      sub={w.sub ? <span style={{ color: w.color }}>{w.sub}</span> : undefined}
      meta={
        <>
          {r.by && <By name={r.by} />}
          <span className="s1-row__meta">{time(r.at)}</span>
        </>
      }
    />
  );
}
