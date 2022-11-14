import express from "express";

import { fetchUser, createUser } from "../../controllers/user";

const router = express.Router();

router.get("/fetch", async (req, res) => {
    const user = await fetchUser();

    res.write("As you can see, controllers still work as expected.\r");
    res.write("Here's the user:\r");
    res.write(JSON.stringify(user));
    res.end();
});

router.post("/create", async (req, res) => {
    const { email, password } = req.body;

    const user = await createUser({ email, password });

    res.send("hello");
});

// managing multiple routes in a single file is also supported

export default router;
