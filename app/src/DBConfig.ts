export const DBConfig = {
    name: 'MyDB',
    version: 3,
    objectStoresMeta: [
      {
        store: 'repositories',
        storeConfig: { keyPath: 'id', autoIncrement: false },
        storeSchema: [
          { name: 'id', keypath: 'id', options: { unique: true }},
          { name: 'data', keypath: 'data', options: { unique: false }},
          { name: 'timestamp', keypath: 'timestamp', options: { unique: false }}
        ]
      }
    ]
};
