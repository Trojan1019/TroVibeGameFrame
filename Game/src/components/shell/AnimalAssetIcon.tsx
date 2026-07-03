import React from 'react';

import chatIcon from '../../assets/animal-ui/icons/icon-chat.svg';
import diyIcon from '../../assets/animal-ui/icons/icon-diy.svg';
import helicopterIcon from '../../assets/animal-ui/icons/icon-helicopter.svg';
import leafIcon from '../../assets/animal-ui/icons/icon-leaf.png';
import mapIcon from '../../assets/animal-ui/icons/icon-map.svg';
import milesIcon from '../../assets/animal-ui/icons/icon-miles.svg';
import shoppingIcon from '../../assets/animal-ui/icons/icon-shopping.svg';
import variantIcon from '../../assets/animal-ui/icons/icon-variant.svg';

const ICONS = {
  chat: chatIcon,
  diy: diyIcon,
  helicopter: helicopterIcon,
  leaf: leafIcon,
  map: mapIcon,
  miles: milesIcon,
  shopping: shoppingIcon,
  variant: variantIcon,
} as const;

export type AnimalAssetIconName = keyof typeof ICONS;

interface AnimalAssetIconProps {
  name: AnimalAssetIconName;
  size?: number;
  alt?: string;
  className?: string;
}

export const AnimalAssetIcon: React.FC<AnimalAssetIconProps> = ({
  name,
  size = 24,
  alt = '',
  className,
}) => (
  <img
    src={ICONS[name]}
    alt={alt}
    className={className}
    style={{ width: size, height: size, objectFit: 'contain' }}
  />
);

