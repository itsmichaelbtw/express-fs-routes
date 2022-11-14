const user = {
    first_name: "John",
    last_name: "Doe",
    age: 25,
    email: "johndoe@examples.com"
};

export async function fetchUser() {
    return new Promise((resolve, reject) => {
        resolve(user);
    });
}

export async function createUser({ email, password }) {
    return new Promise((resolve, reject) => {
        resolve({
            email,
            password
        });
    });
}
