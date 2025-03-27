import mongoose, { Model, Document, ClientSession } from "mongoose";

interface QueryOptions {
  session?: ClientSession;
  select?: string | string[];
  populate?: string | string[];
  pagination?: { page: number; limit: number };
  sort?: any;
  lean?: boolean;
}

interface AggregationConfig {
  pipeline: any[];
  options?: any;
}

interface ExecuteModelConfig {
  queryOptions?: QueryOptions;
  aggregation?: boolean;
  aggregationConfig?: AggregationConfig;
}

export async function executeModelOperation(
  model: Model<any>,
  operation:
    | "find"
    | "findOne"
    | "findById"
    | "create"
    | "updateOne"
    | "updateMany"
    | "deleteOne"
    | "deleteMany"
    | "insertOne"
    | "insertMany"
    | "findByIdAndUpdate"
    | "findByIdAndDelete"
    | "findOneAndUpdate"
    | "bulkWrite",
  config: ExecuteModelConfig,
  data?: any,
  filter?: any
): Promise<any> {
  try {
    // 🔹 Validate required fields for specific operations
    if (
      ["findById", "findByIdAndUpdate", "findByIdAndDelete"].includes(
        operation
      ) &&
      !filter
    ) {
      throw new Error(`${operation} requires a valid ID`);
    }

    // 🔹 Handle aggregation operations
    if (config.aggregation && config.aggregationConfig) {
      return await model.aggregate(config.aggregationConfig.pipeline, {
        ...config.aggregationConfig.options,
        session: config.queryOptions?.session,
      });
    }

    const queryOptions = config.queryOptions || {};
    const finalFilter = filter || {};

    //  Common query processing function
    const applyQueryOptions = async (query: any) => {
      if (queryOptions.session) query = query.session(queryOptions.session);
      if (queryOptions.select) query = query.select(queryOptions.select);
      if (queryOptions.populate) {
        if (Array.isArray(queryOptions.populate)) {
          queryOptions.populate.forEach((p) => (query = query.populate(p)));
        } else {
          query = query.populate(queryOptions.populate);
        }
      }
      if (queryOptions.sort) query = query.sort(queryOptions.sort);
      if (queryOptions.pagination) {
        const { page, limit } = queryOptions.pagination;
        // Add validation
        if (page < 1) throw new Error("Page must be greater than 0");
        if (limit < 1) throw new Error("Limit must be greater than 0");
        query = query.skip((page - 1) * limit).limit(limit);
      }
      // await here since we're executing the query
      return await (queryOptions.lean ? query.lean().exec() : query.exec());
    };

    switch (operation) {
      case "findById": {
        return applyQueryOptions(model.findById(filter));
      }

      case "find": {
        return applyQueryOptions(model.find(finalFilter));
      }

      case "findOne": {
        return applyQueryOptions(model.findOne(finalFilter));
      }

      case "findOneAndUpdate": {
        return applyQueryOptions(
          model.findOneAndUpdate(finalFilter, data, {
            new: true,
          })
        );
      }

      case "create":
      case "insertOne": {
        return queryOptions.session
          ? model
              .create([data], { session: queryOptions.session })
              .then((docs) => docs[0])
          : model.create(data);
      }

      case "insertMany": {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("insertMany requires a non-empty array of documents");
        }

        const insertOptions = queryOptions.session
          ? { session: queryOptions.session }
          : { session: undefined }; // Only include session if it's provided

        return await model.insertMany(data, insertOptions);
      }

      case "updateOne": {
        return applyQueryOptions(
          model.updateOne(finalFilter, data, {
            new: true,
          })
        );
      }

      case "updateMany": {
        return applyQueryOptions(
          model.updateMany(finalFilter, data, { new: true })
        );
      }

      case "deleteOne": {
        if (queryOptions.session) {
          return await model.deleteOne(finalFilter, {
            session: queryOptions.session,
          });
        }
        return await model.deleteOne(finalFilter);
      }

      case "deleteMany": {
        if (queryOptions.session) {
          return await model.deleteMany(finalFilter, {
            session: queryOptions.session,
          });
        }
        return await model.deleteMany(finalFilter);
      }

      case "findByIdAndUpdate": {
        return applyQueryOptions(
          model.findByIdAndUpdate(finalFilter, data, {
            new: true,
          })
        );
      }

      case "findByIdAndDelete": {
        if (queryOptions.session) {
          return await model.findByIdAndDelete(finalFilter, {
            session: queryOptions.session,
          });
        }
        return await model.findByIdAndDelete(finalFilter);
      }

      case "bulkWrite": {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("bulkWrite requires an array of operations");
        }
        if (queryOptions.session) {
          return await model.bulkWrite(data, { session: queryOptions.session });
        }
        return await model.bulkWrite(data);
      }

      default:
        throw new Error(`Invalid operation: ${operation}`);
    }
  } catch (error) {
    console.error(`Error in executeModelOperation [${operation}]:`, {
      filter,
      data,
      error,
    });
    throw error;
  }
}

export async function withTransaction<T>(
  transactionOperations: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await transactionOperations(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    console.error("Transaction aborted due to error:", error);
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
