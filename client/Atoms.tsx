import React from "react"
import { motion, HTMLMotionProps } from "framer-motion"

export const Button: React.FC<
  HTMLMotionProps<"button"> & { color: string }
> = ({ children, color, ...props }) => {
  return (
    <motion.button
      {...props}
      className={`p-2 bg-${color}-600 text-${color}-100 rounded shadow`}
      whileHover={{ translateY: -1 }}
    >
      {children}
    </motion.button>
  )
}

export const Divider: React.FC<{ size?: number }> = ({ size = 4 }) => (
  <div className={`pt-px bg-gray-700 my-${size}`} />
)

export const Spacer: React.FC<{ size?: number }> = ({ size = 2 }) => (
  <div className={`m-${size}`} />
)
