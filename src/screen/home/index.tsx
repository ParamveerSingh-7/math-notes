@@ .. @@
      const response = await axios({
        method: "post",
      }
      )
-        url: `${import.meta.env.VITE_API_URL}/calculate`,
+        url: "http://localhost:8900/calculate",
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        }