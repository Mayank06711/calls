import { IS_OPEN_FEEDBACK } from "../action_creators"

export const feedbackClick=(payload)=>({
      type:IS_OPEN_FEEDBACK,
      payload:payload
})