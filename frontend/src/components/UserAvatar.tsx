import React from 'react';
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
  const preset = findAvatarPreset(avatarUrl);

  if (preset) {
    return (
      <div className={className} style={{ background: preset.gradient }}>
        <span className={iconClassName}>{preset.icon}</span>
      </div>
    );
  }

  if (avatarUrl && isExternalAvatarUrl(avatarUrl)) {
    return (
      <div className={`${className} avatar-image`}>
        <img src={avatarUrl} alt="" />
      </div>
    );
  }

  return <div className={className}>{getInitials(username)}</div>;
};
