import { makeRequest } from '../../utils/apiHandlers';
import { ENDPOINTS, HTTP_METHODS } from '../../constants/apiEndpoints';
import { startLoader, stopLoader } from '../actions/loader.actions';
import { LOADER_TYPES } from '../action_creators';
import { showNotification } from '../actions';
export const processAIChat = ({ 
  question, 
  context, 
  userInfo, 
  isSubscription 
}) => async (dispatch) => {

    const aiChating = LOADER_TYPES.AI_CHAT_PROCESS;
  try {
    dispatch(startLoader(aiChating));

    const payload = {
      question,
      context,
      userinfo: {
        name: userInfo.name,
        gender: userInfo.gender,
        skinColor: userInfo.skinColor,
        age: userInfo.age,
        height: userInfo.height,
        colorsILove: userInfo.colorsILove
      },
      isSubscription: String(isSubscription) // Ensuring it's a string "true" or "false"
    };

    const { data, error, statusCode } = await makeRequest(
        HTTP_METHODS.POST,
        ENDPOINTS.AI.PROCESS_CHAT,
        payload
      );
      if (error) {
        dispatch(showNotification(error.message, error.statusCode));
        return null;
      }

      if (data.success) {
        dispatch(showNotification(data.message || "AI processed successfully!", statusCode));
        console.log("ddddddddddddddddddatat",data.data);
        return data;
      } else {
        dispatch(showNotification("Failed to process AI request", statusCode || 400));
        return null;
      }

  } catch (error) {
    console.error('AI Chat Processing Error:', error);
    dispatch(showNotification(
        "Unable to connect to server. Please check your internet connection.",
        500
      ));
      return null;
  } finally {
    dispatch(stopLoader(aiChating));
  }
};