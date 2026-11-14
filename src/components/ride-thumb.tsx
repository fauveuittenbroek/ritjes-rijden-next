"use client";

import Image from "next/image";
import { useState } from "react";

export function RideThumb({
  icon,
  image,
  title,
  className,
  large,
  priority,
}: {
  icon: string;
  image?: string;
  title: string;
  className?: string;
  large?: boolean;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <Image
        src={image}
        alt={title}
        width={large ? 480 : 320}
        height={large ? 480 : 320}
        sizes={large ? "160px" : "88px"}
        priority={priority}
        className={`ride-photo${className ? ` ${className}` : ""}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={`ride-icon${className ? ` ${className}` : ""}`} aria-hidden="true">
      {icon}
    </span>
  );
}
