import React, { FC } from 'react'
import { AvatarProps } from './types'

const Avatar: FC<AvatarProps> = ({ size = 10, name }) => {
    const symbol = name.split(" ").map((ch) => ch.charAt(0).toUpperCase()).join('');
    return (
        <div className={`relative inline-flex items-center justify-center overflow-hidden bg-sky-400 rounded-full dark:bg-sky-600`}
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            <span className="font-medium" style={{ color: '#ffffff' }}>{symbol}</span>
        </div>
    )
}

export default Avatar