//////////////////////////////////////////////////
// Iterative Exponential Transformations script //
//////////////////////////////////////////////////
// https://github.com/bahrt/astrophotography
//
// By Sebastian Jeremias
// Reusing code snippets from
// https://github.com/beshanoe and
// http://www.skypixels.at/pixinsight_scripts.html
//
//////////////////////////////////////////////////


/* START USER VARIABLES */

/* 
NOTE: expTransfIterations variable is the amount of iterations for each "with"
*and* "without" lightness mask. Hence, total number of iterations will double
this number.
expTransfOrder is the strenght of each Exponential Transformation pass. 

Default values are expTransfIterations = 3 and expTransfORder = 0.2 
*/

var expTransfIterations = 3;
var expTransfOrder = 0.2;

/* END USER VARIABLES */


///////////////////////////////////////////////////////////
/* You shouldn't need to change anything below this line */
///////////////////////////////////////////////////////////

#feature-id    My Scripts > Iterative Exponential Transformation
#feature-info  This script will apply small Exponential Transformations \
               iteratively, separating stars from nebulosity and using \
               lightness masks, so that stars and bright structures are preserved.

#include <pjsr/UndoFlag.jsh>


// Duplicate image
function cloneView(view, newName)
{
   var P = new PixelMath;
   P.expression = view.id;
   P.expression1 = "";
   P.expression2 = "";
   P.expression3 = "";
   P.useSingleExpression = true;
   P.symbols = "";
   P.generateOutput = true;
   P.singleThreaded = false;
   P.use64BitWorkingImage = false;
   P.rescale = false;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;
   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;
   P.createNewImage = true;
   P.showNewImage = false;
   P.newImageId = newName;
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
   if (P.executeOn(view))
      return View.viewById(newName);
   {
      message("Mask creation failed in function cloneView", "Error");
      return null;
   }
}


function removeNebulosity(view)
{
   var P = new ATrousWaveletTransform;
   P.layers = [ // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [true, true, 0.000, false, 3.000, 1.00, 1],
      [false, true, 0.000, false, 3.000, 1.00, 1]
   ];
   P.scaleDelta = 0;
   P.scalingFunctionData = [
      0.25,0.5,0.25,
      0.5,1,0.5,
      0.25,0.5,0.25
   ];
   P.scalingFunctionRowFilter = [
      0.5,
      1,
      0.5
   ];
   P.scalingFunctionColFilter = [
      0.5,
      1,
      0.5
   ];
   P.scalingFunctionNoiseSigma = [
      0.8003,0.2729,0.1198,
      0.0578,0.0287,0.0143,
      0.0072,0.0036,0.0019,
      0.001
   ];
   P.scalingFunctionName = "Linear Interpolation (3)";
   P.largeScaleFunction = ATrousWaveletTransform.prototype.NoFunction;
   P.curveBreakPoint = 0.75;
   P.noiseThresholding = false;
   P.noiseThresholdingAmount = 1.00;
   P.noiseThreshold = 3.00;
   P.softThresholding = true;
   P.useMultiresolutionSupport = false;
   P.deringing = false;
   P.deringingDark = 0.1000;
   P.deringingBright = 0.0000;
   P.outputDeringingMaps = false;
   P.lowRange = 0.0000;
   P.highRange = 0.0000;
   P.previewMode = ATrousWaveletTransform.prototype.Disabled;
   P.previewLayer = 0;
   P.toLuminance = true;
   P.toChrominance = true;
   P.linear = false;


   P.executeOn(view);
}


function removeStars(view, starsView)
{
   var P = new PixelMath;
   P.expression = view.id + "-" + starsView.id;
   P.expression1 = "";
   P.expression2 = "";
   P.expression3 = "";
   P.useSingleExpression = true;
   P.symbols = "";
   P.generateOutput = true;
   P.singleThreaded = false;
   P.use64BitWorkingImage = false;
   P.rescale = false;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;
   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;
   P.createNewImage = false;
   P.showNewImage = true;
   P.newImageId = "";
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

   P.executeOn(view);
}


function applyExponentialTransf(view, useLM)
{
   var P = new ExponentialTransformation;
   P.functionType = ExponentialTransformation.prototype.PIP;
   P.order = expTransfOrder;
   P.sigma = 0.00;
   P.useLightnessMask = useLM;
   P.executeOn(view);
}


function extractLuminance(view, id)
{
   if (view.image.isColor)
   {
      var img = new Image(view.image.width, view.image.height);
      view.image.getLightness(img);
      var win = new ImageWindow(img.width, img.height,
                                img.numberOfChannels,
                                img.bitsPerSample, img.isReal,
                                img.isColor);
      win.hide();
      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      win.mainView.image.apply(img);
      win.mainView.endProcess();
      win.mainView.id = id;
      return win.mainView;
   }
   else
   {
      return cloneView(view, id);
   }
}


function convolve(lumMask)
{
   var P = new Convolution;
   P.mode = Convolution.prototype.Parametric;
   P.sigma = 2.00;
   P.shape = 2.00;
   P.aspectRatio = 1.00;
   P.rotationAngle = 0.00;
   P.filterSource = "";
   P.rescaleHighPass = false;
   P.viewId = "";

   P.executeOn(lumMask);
}


function applyLuminanceMask(view, lumMask)
{
   var viewWindow = ImageWindow.windowById(view.id);
   var maskWindow = ImageWindow.windowById(lumMask.id);

   viewWindow.mask = maskWindow;
   viewWindow.maskInverted = true;
   viewWindow.maskEnabled = true;
   viewWindow.maskVisible = false;
}


function disableMask(view)
{
   var viewWindow = ImageWindow.windowById(view.id);
   viewWindow.maskDisabled = true;
   viewWindow.maskEnabled = false;
   viewWindow.maskVisible = false;
}


function restoreStars(view, starsView)
{

   var P = new PixelMath;
   P.expression = view.id + "+" + starsView.id;
   P.expression1 = "";
   P.expression2 = "";
   P.expression3 = "";
   P.useSingleExpression = true;
   P.symbols = "";
   P.generateOutput = true;
   P.singleThreaded = false;
   P.use64BitWorkingImage = false;
   P.rescale = false;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;
   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;
   P.createNewImage = false;
   P.showNewImage = true;
   P.newImageId = "";
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

   P.executeOn(view);
}



// MAIN //
function main(){
   Console.show();
   Console.noteln("Iterative Exponential Transformation script is running...");

   var myView = Parameters.targetView;

   if (Parameters.isViewTarget){

      var totalIterations = expTransfIterations * 2;
      for (i = 1; i <= totalIterations; i++) {
         Console.noteln("*****************************************");
         Console.noteln("*** Applying pass #" + i +" of " + totalIterations);
         Console.noteln("*****************************************");
         Console.noteln("-- Separating stars from nebulosity.");
         var clonedView = cloneView(myView, myView.id + "_clone");
         removeNebulosity(clonedView);
         removeStars(myView, clonedView);

         Console.noteln("-- Applying lightness mask");
         var maskId = myView.id + "_lightness";
         var lumMask = extractLuminance(myView, maskId);
         convolve(lumMask);
         applyLuminanceMask(myView, lumMask);


         if ( i <= expTransfIterations )
         {
            Console.noteln("-- Applying Exponential Transf. w/o lightness mask");
            applyExponentialTransf(myView, useLM=false);
         } else
         {
            Console.noteln("-- Applying Exponential Transf. with lightness mask");
            applyExponentialTransf(myView, useLM=true);
         }

         Console.noteln("-- Restoring stars");
         disableMask(myView);
         restoreStars(myView, clonedView);
      }

   } else {
      Console.criticalln("ERROR: This script needs to be applied to an image (i.e. target view)");
   }
   Console.noteln("****************************************");
   Console.noteln("*************** FINISHED ***************");
   Console.noteln("****************************************");

}

main();
