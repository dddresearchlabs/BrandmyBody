"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  DURATION_OPTIONS,
  WEAR_OPTIONS,
  type DurationDays,
  type WearMonths,
} from "@/lib/listings";
import { HARDCODED_SPOTS } from "@/lib/spots";
import { assertImageFile } from "@/lib/image-file";

const fieldClass =
  "mt-1 w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

export function ListForm() {
  const router = useRouter();
  const [scope, setScope] = useState<"entire" | "selected">("entire");
  const [durationDays, setDurationDays] = useState<DurationDays>(7);
  const [wearMonths, setWearMonths] = useState<WearMonths>(12);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedIds = useMemo(
    () =>
      HARDCODED_SPOTS.filter((spot) => selected[spot.spotId]).map(
        (spot) => spot.spotId,
      ),
    [selected],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const socials = {
      x: String(form.get("x") ?? "").trim(),
      instagram: String(form.get("instagram") ?? "").trim(),
      tiktok: String(form.get("tiktok") ?? "").trim(),
      website: String(form.get("website") ?? "").trim(),
    };

    if (!displayName) {
      setError("Display name is required");
      return;
    }

    const bodyPriceDollars = Number(form.get("bodyPrice"));
    const spots =
      scope === "selected"
        ? selectedIds.map((spotId) => ({
            spotId,
            priceDollars: Number(form.get(`price-${spotId}`)),
          }))
        : [];

    const frontPhoto = form.get("photo");
    const backPhoto = form.get("photoBack");
    for (const file of [frontPhoto, backPhoto]) {
      if (file instanceof File && file.size > 0) {
        try {
          assertImageFile(file);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not upload photo");
          return;
        }
      }
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          socials,
          scope,
          durationDays,
          wearMonths,
          bodyPriceDollars,
          spots,
        }),
      });
      const data = (await res.json()) as {
        listing?: { id: string };
        error?: string;
      };
      if (res.status === 401) {
        router.push("/login?next=/list");
        return;
      }
      if (!res.ok || !data.listing) {
        setError(data.error ?? "Could not save listing");
        setSubmitting(false);
        return;
      }

      const photoErrors: string[] = [];
      for (const [file, view, label] of [
        [frontPhoto, "front", "Front photo"],
        [backPhoto, "back", "Back photo"],
      ] as const) {
        if (!(file instanceof File) || file.size === 0) continue;
        const upload = new FormData();
        upload.set("listingId", data.listing.id);
        upload.set("file", file);
        upload.set("view", view);
        const photoRes = await fetch("/api/uploads/listing-photo", {
          method: "POST",
          body: upload,
        });
        const photoData = (await photoRes.json()) as { error?: string };
        if (!photoRes.ok) {
          photoErrors.push(
            photoData.error
              ? `${label} could not be uploaded: ${photoData.error}`
              : `${label} could not be uploaded.`,
          );
        }
      }
      if (photoErrors.length > 0) {
        setSavedHref(`/b/${data.listing.id}`);
        setError(`Listing saved. ${photoErrors.join(" ")}`);
        setSubmitting(false);
        return;
      }

      router.push(`/b/${data.listing.id}`);
    } catch {
      setError("Could not save listing");
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-10 grid gap-6" onSubmit={onSubmit}>
      <label className="text-sm">
        Display name
        <input
          name="displayName"
          type="text"
          required
          autoComplete="nickname"
          className={fieldClass}
        />
      </label>

      <label className="text-sm">
        Front photo
        <span className="text-muted"> (optional)</span>
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className={`${fieldClass} file:mr-3 file:rounded file:border-0 file:bg-line file:px-2 file:py-1 file:text-foreground`}
        />
      </label>

      <label className="text-sm">
        Back photo
        <span className="text-muted"> (optional)</span>
        <input
          name="photoBack"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className={`${fieldClass} file:mr-3 file:rounded file:border-0 file:bg-line file:px-2 file:py-1 file:text-foreground`}
        />
      </label>

      <fieldset className="grid gap-3">
        <legend className="text-sm">Socials</legend>
        <label className="text-sm text-muted">
          X
          <input name="x" type="text" placeholder="@handle" className={fieldClass} />
        </label>
        <label className="text-sm text-muted">
          Instagram
          <input
            name="instagram"
            type="text"
            placeholder="@handle"
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-muted">
          TikTok
          <input
            name="tiktok"
            type="text"
            placeholder="@handle"
            className={fieldClass}
          />
        </label>
        <label className="text-sm text-muted">
          Website
          <input
            name="website"
            type="text"
            placeholder="https://"
            className={fieldClass}
          />
        </label>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm">What is for sale</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scope"
            checked={scope === "entire"}
            onChange={() => setScope("entire")}
          />
          Entire body
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scope"
            checked={scope === "selected"}
            onChange={() => setScope("selected")}
          />
          Selected parts
        </label>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm">Wear for</legend>
        {WEAR_OPTIONS.map((option) => (
          <label key={option.months} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="wearMonths"
              required
              checked={wearMonths === option.months}
              onChange={() => setWearMonths(option.months)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-sm">Auction length</legend>
        {DURATION_OPTIONS.map((option) => (
          <label key={option.days} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="durationDays"
              checked={durationDays === option.days}
              onChange={() => setDurationDays(option.days)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {scope === "entire" ? (
        <label className="text-sm">
          Starting price (all 10 spots)
          <input
            name="bodyPrice"
            type="number"
            min={1}
            step="1"
            required
            className={fieldClass}
          />
        </label>
      ) : (
        <fieldset className="grid gap-4">
          <legend className="text-sm">Spots and starting prices</legend>
          {HARDCODED_SPOTS.map((spot) => {
            const on = Boolean(selected[spot.spotId]);
            return (
              <div key={spot.spotId} className="rounded-md border border-line p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [spot.spotId]: event.target.checked,
                      }))
                    }
                  />
                  {spot.spotId}. {spot.name}
                  <span className="text-muted">
                    · {spot.view ?? "leg"} · {spot.sizeLabel}
                  </span>
                </label>
                {on ? (
                  <label className="mt-2 block text-sm text-muted">
                    Starting price
                    <input
                      name={`price-${spot.spotId}`}
                      type="number"
                      min={1}
                      step="1"
                      required
                      className={fieldClass}
                    />
                  </label>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      )}

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {savedHref ? (
        <a href={savedHref} className="text-sm text-accent hover:underline">
          View listing
        </a>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-accent px-5 py-3 text-sm text-white hover:brightness-110 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Publish listing"}
      </button>
    </form>
  );
}
