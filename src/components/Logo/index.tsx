import { useState } from "react";

type LogoProps = {
  size: number
  begin?: number
  repeatCount?: number
}

export const Logo = (props: LogoProps) => { 
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 1200 1200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <g>
        <path id="backwing" style={{ fill: "#e0f0f4" }}
          d="M 895,423 C 870,555 808,705 679,786 567,857 448,775 427,674 370,478 427,195 637,55 773,-21 880,102 894,213 908,280 907,352 895,423 Z"
        >
          <animateTransform 
            key={ isHovered ? "hovered" : "not-hovered" }
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 600 670"
            to="-25 600 670"
            dur="0.1s"
            begin={ isHovered ? "0s" : props.begin ? `${props.begin}s` : "never" }
            repeatCount={ isHovered ? "indefinite" : props.repeatCount ? 10*props.repeatCount : "0" }
          />
        </path>
        <path id="body" style={{ fill: "#eac840" }}
          d="m 697,730 c 51,132 -60,251 -158,311 -120,72 -304,119 -424,2.62 C 31,937 120,796 206,733 314,650 463,599 601,646 640,661 678,689 697,730 Z"
        />
        <path id="frontwing" style={{ fill: "#a2dbed" }}
          d="M 778,423 C 799,555 790,705 690,786 603,858 455,775 398,674 273,479 230,195 391,56 501,-21 650,102 704,213 741,280 765,352 778,423 Z"
        >
          <animateTransform 
            key={ isHovered ? "hovered" : "not-hovered" }
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 600 700"
            to="25 600 700"
            dur="0.1s"
            begin={ isHovered ? "0s" : props.begin ? `${props.begin}s` : "never" }
            repeatCount={ isHovered ? "indefinite" : props.repeatCount ? 10*props.repeatCount : "0" }
          />
        </path>
        <path id="head" style={{ fill: "#d4af37" }}
          d="M 1077,820 C 1058,948 866,1002 742,929 626,872 594,723 690,650 c 100,-88 299,-53 365,62 21,34 29,72 22,109 z"
        />
      </g>
    </svg>
  )
}