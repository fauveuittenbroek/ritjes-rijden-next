"use client";

export function Stars({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];

  if (!onChange) {
    return (
      <span className="stars" aria-label={`${value} van 5 sterren`}>
        {stars.map((star) => (
          <span key={star} className={star <= value ? "star on" : "star"} aria-hidden="true" style={{ fontSize: size }}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="stars stars-input" role="radiogroup" aria-label="Beoordeling">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? "ster" : "sterren"}`}
          className={star <= value ? "star on" : "star"}
          style={{ fontSize: size }}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
