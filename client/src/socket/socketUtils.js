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
    onRetry = (attempt) => console.log(`Retry attempt ${attempt}`),
    shouldRetry = (error) => true, // Default retry on all errors
  } = options;

  return async (...args) => {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await handler(...args);
      } catch (error) {
        attempt++;

        if (attempt === maxRetries || !shouldRetry(error)) {
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
// Update the emitEvent function to include response validation
// ... existing code ...

export const emitEvent = (
  socket,
  {
    event,
    data = {},
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

        const emitFunction = () => {
          if (acknowledgment) {
            // Handle room and broadcast options
            if (room && broadcast) {
              socket.broadcast.to(room).emit(event, data, (response) => {
                try {
                  if (validateResponse && !validateResponse(response)) {
                    const error = new Error("Invalid response received");
                    onError?.(error);
                    reject(error);
                    return;
                  }
                  onSuccess?.(response);
                  resolve(response);
                } catch (error) {
                  onError?.(error);
                  reject(error);
                }
              });
            } else if (room) {
              socket.to(room).emit(event, data, (response) => {
                try {
                  if (validateResponse && !validateResponse(response)) {
                    const error = new Error("Invalid response received");
                    onError?.(error);
                    reject(error);
                    return;
                  }
                  onSuccess?.(response);
                  resolve(response);
                } catch (error) {
                  onError?.(error);
                  reject(error);
                }
              });
            } else if (broadcast) {
              socket.broadcast.emit(event, data, (response) => {
                try {
                  if (validateResponse && !validateResponse(response)) {
                    const error = new Error("Invalid response received");
                    onError?.(error);
                    reject(error);
                    return;
                  }
                  onSuccess?.(response);
                  resolve(response);
                } catch (error) {
                  onError?.(error);
                  reject(error);
                }
              });
            } else {
              socket.emit(event, data, (response) => {
                try {
                  console.log(socket.connected, event, data, !validateResponse(response), validateResponse)
                  if (validateResponse && !validateResponse(response)) {
                    const error = new Error("Invalid response received");
                    onError?.(error);
                    reject(error);
                    return;
                  }
                  onSuccess?.(response);
                  resolve(response);
                } catch (error) {
                  onError?.(error);
                  reject(error);
                }
              });
            }
          } else {
            // Handle non-acknowledgment emits
            if (room && broadcast) {
              socket.broadcast.to(room).emit(event, data);
            } else if (room) {
              socket.to(room).emit(event, data);
            } else if (broadcast) {
              socket.broadcast.emit(event, data);
            } else {
              socket.emit(event, data);
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
        handlers.onError?.(error);
        reject(error);
      }
    });
  };

  // Handle retries if specified
  if (retryOptions) {
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
