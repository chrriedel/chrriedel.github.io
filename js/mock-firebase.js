// Mock Firestore FieldValue
const mockFieldValue = {
    serverTimestamp: () => ({
        toDate: () => new Date(),
        toString: () => new Date().toISOString()
    }),
    increment: (n) => ({
        __increment: n
    })
};

// Simple Mock Firebase implementation
class MockFirestore {
    constructor() {
        this.comments = new Map();
        this.listeners = [];
    }

    collection(name) {
        return {
            add: async (data) => {
                const id = `doc_${Date.now()}`;
                this.comments.set(id, { ...data });
                this._notifyListeners('added', id, data);
                return { id };
            },
            
            doc: (id) => ({
                update: async (data) => {
                    const existingData = this.comments.get(id) || {};
                    const newData = { ...existingData };
                    
                    // Handle increment operation
                    if (data.upvotes && data.upvotes.__increment) {
                        newData.upvotes = (newData.upvotes || 0) + data.upvotes.__increment;
                    } else {
                        Object.assign(newData, data);
                    }
                    
                    this.comments.set(id, newData);
                    this._notifyListeners('modified', id, newData);
                }
            }),
            
            where: (field, operator, value) => ({
                get: async () => ({
                    docs: Array.from(this.comments.entries())
                        .filter(([_, data]) => data[field] === value)
                        .map(([id, data]) => ({
                            id,
                            ref: {
                                id,
                                update: async (updateData) => {
                                    const existingData = this.comments.get(id) || {};
                                    const newData = { ...existingData, ...updateData };
                                    this.comments.set(id, newData);
                                    this._notifyListeners('modified', id, newData);
                                }
                            },
                            data: () => data
                        }))
                })
            }),
            
            orderBy: () => ({
                onSnapshot: (callback) => {
                    // Initial data
                    callback({
                        docChanges: () => Array.from(this.comments.entries())
                            .map(([id, data]) => ({
                                type: 'added',
                                doc: {
                                    id,
                                    data: () => data
                                }
                            }))
                    });
                    
                    // Store listener for future updates
                    this.listeners.push(callback);
                    
                    // Return unsubscribe function
                    return () => {
                        const index = this.listeners.indexOf(callback);
                        if (index > -1) {
                            this.listeners.splice(index, 1);
                        }
                    };
                }
            })
        };
    }

    batch() {
        const operations = [];
        return {
            update: (docRef, data) => {
                operations.push(async () => {
                    const existingData = this.comments.get(docRef.id) || {};
                    const newData = { ...existingData, ...data };
                    this.comments.set(docRef.id, newData);
                    this._notifyListeners('modified', docRef.id, newData);
                });
                return this;
            },
            commit: async () => {
                for (const operation of operations) {
                    await operation();
                }
            }
        };
    }

    _notifyListeners(type, id, data) {
        this.listeners.forEach(callback => {
            callback({
                docChanges: () => [{
                    type,
                    doc: {
                        id,
                        data: () => data
                    }
                }]
            });
        });
    }
}

// Create mock Firebase
const mockFirestore = () => {
    const firestoreInstance = new MockFirestore();
    firestoreInstance.FieldValue = mockFieldValue;
    return firestoreInstance;
};
mockFirestore.FieldValue = mockFieldValue;

window.firebase = {
    initializeApp: () => {},
    firestore: mockFirestore
};
