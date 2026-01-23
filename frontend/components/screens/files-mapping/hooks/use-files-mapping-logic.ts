"use client"

import type { FilesMappingProps } from "../types"
import { useFilesMappingHandlers } from "./use-files-mapping-handlers"
import { useFilesMappingState } from "./use-files-mapping-state"

export const useFilesMappingLogic = (props: FilesMappingProps) => {
  const state = useFilesMappingState(props)
  const handlers = useFilesMappingHandlers(state)
  return { ...state, ...handlers }
}

