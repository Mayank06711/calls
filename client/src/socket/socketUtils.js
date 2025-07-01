/**
 * Wraps a handler function with retry mechanism
 * @param {Function} handler - The handler function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} - Wrapped handler with retry logic
 */
export const withRetry = (handler, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    exponential = true,
    onRetry = (attempt) => console.log(`[withRetry] Retry attempt ${attempt}`),
    shouldRetry = () => true, // Default retry on all errors
  } = options;

  return async (...args) => {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        if (attempt > 0) {
          console.log(`[withRetry] Attempt ${attempt + 1} of ${maxRetries}`);
        }
        return await handler(...args);
      } catch (error) {
        attempt++;
        console.log(`[withRetry] Error on attempt ${attempt}:`, error);
        if (attempt === maxRetries || !shouldRetry(error)) {
          console.log(`[withRetry] Giving up after ${attempt} attempts.`);
          throw error;
        }
        const waitTime = exponential ? delay * Math.pow(2, attempt - 1) : delay;
        onRetry(attempt, error);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  };
};

/**
 * Enhanced socket event emitter with flexible options
 * @param {Socket} socket - Socket instance
 * @param {Object} config - Event configuration
 * @returns {Promise} - Event response
 */
export const emitEvent = (
  socket,
  {
    event,
    data = {}, // it could be  a funtion also which return the data/payload it is important to protect retrying with old values
    room = null,
    broadcast = false,
    timeout = 5000,
    retryOptions = null,
    handlers = {},
    acknowledgment = true,
    validateResponse = null,
  }
) => {
  const emitHandler = async () => {
    return new Promise((resolve, reject) => {
      try {
        const { onBefore, onSuccess, onError, onTimeout } = handlers;

        onBefore?.();
        const payload = typeof data === 'function' ? data() : data;
        console.log(`[emitEvent] Emitting event '${event}' with data:`, payload, 'acknowledgment:', acknowledgment);

        const emitFunction = () => {
          if (acknowledgment) {
            // Handle room and broadcast options
            const handleResponse = (response) => {
              try {
                console.log(`[emitEvent] Received response for event '${event}':`, response);
                if (validateResponse && !validateResponse(response)) {
                  const error = new Error("Invalid response received");
                  error.response = response; // Attach the original response so we can use it 
                  console.log(`[emitEvent] Response failed validation for event '${event}'. Calling onError handler.`);
                  if (onError) {
                    // If onError throws or returns a rejected promise, propagate that error up to the retry loop
                    try {
                      const maybePromise = onError(error);
                      if (maybePromise && typeof maybePromise.then === 'function') {
                        maybePromise.then(() => {
                          // If onError resolves, reject with the original error
                          reject(error);
                        }).catch((err) => {
                          // If onError rejects/throws, propagate that error (e.g., SOCKET_REAUTHENTICATE)
                          reject(err || error);
                        });
                        return;
                      }
                    } catch (err) {
                      // If onError throws synchronously, propagate that error
                      reject(err || error);
                      return;
                    }
                  }
                  // If no onError or it doesn't throw, reject with the original error
                  reject(error);
                  return;
                }
                onSuccess?.(response);
                resolve(response);
              } catch (error) {
                console.log(`[emitEvent] Exception in handleResponse for event '${event}':`, error);
                onError?.(error);
                reject(error);
              }
            };
            // Always get the latest data if data is a function
            const getPayload = () => (typeof data === 'function' ? data() : data);
            if (room && broadcast) {
              socket.broadcast.to(room).emit(event, getPayload(), (response) => {
                handleResponse(response);
              });
            } else if (room) {
              socket.to(room).emit(event, getPayload(), (response) => {
                handleResponse(response);
              });
            } else if (broadcast) {
              socket.broadcast.emit(event, getPayload(), (response) => {
                handleResponse(response);
              });
            } else {
              socket.emit(event, getPayload(), (response) => {
                handleResponse(response);
              });
            }
          } else {
            // Handle non-acknowledgment emits
            const getPayload = () => (typeof data === 'function' ? data() : data);
            if (room && broadcast) {
              socket.broadcast.to(room).emit(event, getPayload());
            } else if (room) {
              socket.to(room).emit(event, getPayload());
            } else if (broadcast) {
              socket.broadcast.emit(event, getPayload());
            } else {
              socket.emit(event, getPayload());
            }
            resolve();
          }
        };

        // Set up timeout if specified
        if (timeout) {
          const timeoutId = setTimeout(() => {
            const timeoutError = new Error(
              `Event ${event} timed out after ${timeout}ms`
            );
            console.log(`[emitEvent] Timeout for event '${event}' after ${timeout}ms`);
            onTimeout?.(timeoutError);
            reject(timeoutError);
          }, timeout);

          // Wrap the original resolve to clear timeout
          const originalResolve = resolve;
          resolve = (...args) => {
            clearTimeout(timeoutId);
            originalResolve(...args);
          };
        }

        emitFunction();
      } catch (error) {
        console.log(`[emitEvent] Exception in emitHandler for event '${event}':`, error);
        handlers.onError?.(error);
        reject(error);
      }
    });
  };

  // Handle retries if specified
  if (retryOptions) {
    console.log(`[emitEvent] Using retry logic for event '${event}'`);
    return withRetry(emitHandler, retryOptions)();
  }

  return emitHandler();
};

/**
 * Enhanced socket event listener with flexible options
 * @param {Socket} socket - Socket instance
 * @param {Object} config - Listener configuration
 * @returns {Function} - Cleanup function
 */
export const listenEvent = (
  socket,
  {
    event,
    handler,
    room = null,
    once = false,
    errorHandler = (error) =>
      console.error(`Error in ${event} handler:`, error),
    transform = (data) => data, // Transform received data
    filter = () => true, // Filter received events
    handlers = {},
  }
) => {
  if (!socket) {
    console.warn(`Cannot setup listener for ${event}: Socket not provided`);
    return () => {};
  }

  // Join room if specified
  if (room) {
    socket.join(room);
  }

  // Create wrapped handler
  const wrappedHandler = async (...args) => {
    try {
      // Pre-handle hook
      handlers.onBefore?.(...args);

      // Apply filter
      if (!filter(...args)) {
        return;
      }

      // Transform data
      const transformedData = transform(...args);

      // Execute handler
      await handler(transformedData);

      // Post-handle hook
      handlers.onAfter?.(...args);
    } catch (error) {
      errorHandler(error);
      handlers.onError?.(error);
    }
  };

  // Attach listener
  if (once) {
    socket.once(event, wrappedHandler);
  } else {
    socket.on(event, wrappedHandler);
  }

  // Return cleanup function
  return () => {
    socket.off(event, wrappedHandler);
    if (room) {
      socket.leave(room);
    }
  };
};
