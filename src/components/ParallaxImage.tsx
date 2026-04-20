import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  speed?: number; // 0.1 = subtle, 0.3 = more pronounced
}

export function ParallaxImage({ src, alt, className = '', speed = 0.15 }: ParallaxImageProps) {
  const ref = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Transform scroll progress to Y movement
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1.05, 1.1]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.img
        src={src}
        alt={alt}
        style={{ y, scale }}
        className={`absolute inset-0 w-full h-full object-cover object-[40%_center] xl:object-center ${className}`}
      />
    </div>
  );
}
