
export const debug = {
    /** Include a stack trace of the creation of the CancellationToken */
    cancellationTokenCreationTrace: false,
    /** Include a stack trace of the cancellation of the CancellationToken */
    cancellationTokenCancellationTrace: false,
    /** Include a stack trace of the subscriptions to the CancellationToken */
    cancellationTokenSubscriptionTrace: false,

    /** Track await points for deferred.promise when a cancellationToken is attached */
    trackDeferredThenStacks: false
};



