const asyncHandler =(requestHandler) =>{
  return (req, res, next) =>{
    Promise.resolve(requestHandler(req, res, next))
    .catch((error)=>next(error))
  }
} // promises-method

export {asyncHandler}

/* for understanding
const asyncHandler = () =>{} 
const asyncHandler = (fn) =>{()=>{}} or,
const asyncHandler = (fn) =>() =>{}
const asyncHandler = (fn) => async() =>{}
*/

// Alternative : try-catch-method
// const asyncHandler = (fn) => async(req, res, next) =>{ // higher-order function
//   try {
//     await fn(req,res,next)
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message
//     })
//   }
// }