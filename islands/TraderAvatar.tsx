import { useState } from "preact/hooks";

interface Props {
  avatarUrl: string;
  username: string;
  scoreColor: string;
  className?: string;
}

export default function TraderAvatar({ avatarUrl, username, scoreColor, className = "" }: Props) {
  const [imgSrc, setImgSrc] = useState(avatarUrl);

  const handleError = () => {
    setImgSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=128`);
  };

  return (
    <img
      src={imgSrc}
      alt={username}
      class={className}
      style={`border-color: ${scoreColor}; box-shadow: 0 0 12px ${scoreColor}60;`}
      onError={handleError}
    />
  );
}

