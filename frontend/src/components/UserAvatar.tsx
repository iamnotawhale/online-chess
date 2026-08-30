import React, { useEffect, useState } from 'react';
import { findAvatarPreset, getInitials, isExternalAvatarUrl } from '../utils/avatars';

type UserAvatarProps = {
  avatarUrl?: string | null;
  username?: string;
  className?: string;
  iconClassName?: string;
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  username,
  className = 'avatar-circle',
  iconClassName = 'avatar-icon',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const preset = findAvatarPreset(avatarUrl);

  if (preset) {
    return (
      <div className={className} style={{ background: preset.gradient }}>
        <span className={iconClassName}>{preset.icon}</span>
      </div>
    );
  }

  if (avatarUrl && isExternalAvatarUrl(avatarUrl) && !imgFailed) {
    return (
      <div className={`${className} avatar-image`}>
        <img src={avatarUrl} alt="" onError={() => setImgFailed(true)} />
      </div>
    );
  }

  return <div className={className}>{getInitials(username)}</div>;
};
