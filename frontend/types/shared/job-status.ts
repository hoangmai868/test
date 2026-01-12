export const JOB_STATUS_LIST = ["draft", "processing", "completed"] as const

export type JobStatus = (typeof JOB_STATUS_LIST)[number]

