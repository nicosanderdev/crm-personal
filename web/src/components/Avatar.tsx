import { initials } from "../format.ts";

type Props = {
  name: string;
  photoUrl: string | null;
  size?: "sm" | "md";
};

export function Avatar({ name, photoUrl, size = "sm" }: Props) {
  const dim = size === "md" ? "h-16 w-16 text-lg" : "h-9 w-9 text-xs";
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${dim} rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dim} grid place-items-center rounded-full bg-paper-2 font-medium text-ink`}
    >
      {initials(name)}
    </div>
  );
}
