export const DBConfig = {
    name: 'MyDB',
    version: 2,
    objectStoresMeta: [
      {
        store: 'data',
        storeConfig: { keyPath: 'date', autoIncrement: false },
        storeSchema: [
          { name: 'date', keypath: 'date', options: { unique: false }},
          { name: 'data', keypath: 'data', options: { unique: false }}
        ]
      },
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
